import crypto from "node:crypto";
import { Chess } from "chess.js";
import { redis } from "../redis.js";
import { HttpError } from "../utils/http.js";

const ATTEMPT_TTL_SECONDS = 30 * 60;
const BATCH_TTL_SECONDS = 5 * 60;
const RECENT_TTL_SECONDS = 30 * 24 * 60 * 60;
const RECENT_LIMIT = 100;
const BATCH_SIZE = 25;
let lichessRequestQueue = Promise.resolve();

function attemptKey(attemptId) {
  return `puzzle:attempt:${attemptId}`;
}

function activeAttemptKey(userId) {
  return `puzzle:active:${userId}`;
}

function recentKey(userId) {
  return `puzzle:recent:${userId}`;
}

function batchKey(difficulty) {
  return `puzzle:batch:${difficulty}`;
}

function difficultyForRating(rating) {
  if (rating < 1150) return "easiest";
  if (rating < 1400) return "easier";
  if (rating < 1650) return "normal";
  if (rating < 1900) return "harder";
  return "hardest";
}

function moveFromUci(chess, uci) {
  return chess.move({
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci[4] || undefined,
  });
}

function puzzlePosition(puzzleAndGame) {
  if (puzzleAndGame.puzzle?.fen) return puzzleAndGame.puzzle.fen;

  const chess = new Chess();
  chess.loadPgn(puzzleAndGame.game?.pgn || "");
  return chess.fen();
}

function solutionDetails(initialFen, solution) {
  const chess = new Chess(initialFen);

  return solution.map((uci) => {
    const move = moveFromUci(chess, uci);

    if (!move) {
      throw new Error(`Invalid puzzle solution move: ${uci}`);
    }

    return {
      uci,
      san: move.san,
      fenAfter: chess.fen(),
    };
  });
}

async function fetchLichessBatch(difficulty) {
  const key = batchKey(difficulty);
  const cached = await redis.get(key);

  if (cached) {
    return JSON.parse(cached);
  }

  const request = async () => {
    const params = new URLSearchParams({
      nb: String(BATCH_SIZE),
      difficulty,
    });
    const response = await fetch(`https://lichess.org/api/puzzle/batch/mix?${params.toString()}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "blunder.ch/0.1",
      },
    });

    if (!response.ok) {
      const error = new HttpError(
        response.status === 429 ? 503 : response.status,
        response.status === 429
          ? "Puzzle provider is busy. Try again in a minute."
          : "Unable to load puzzles."
      );
      throw error;
    }

    const payload = await response.json();
    const puzzles = Array.isArray(payload?.puzzles) ? payload.puzzles : [];

    if (!puzzles.length) {
      throw new HttpError(503, "No puzzles are available right now.");
    }

    await redis.setex(key, BATCH_TTL_SECONDS, JSON.stringify(puzzles));
    return puzzles;
  };

  const queuedRequest = lichessRequestQueue.then(request, request);
  lichessRequestQueue = queuedRequest.catch(() => {});
  return queuedRequest;
}

async function rememberPuzzle(userId, puzzleId) {
  const key = recentKey(userId);
  const pipeline = redis.pipeline();
  pipeline.lrem(key, 0, puzzleId);
  pipeline.lpush(key, puzzleId);
  pipeline.ltrim(key, 0, RECENT_LIMIT - 1);
  pipeline.expire(key, RECENT_TTL_SECONDS);
  await pipeline.exec();
}

function closestPuzzle(puzzles, targetRating, recentIds) {
  const unseen = puzzles.filter((entry) => !recentIds.has(entry.puzzle?.id));
  const candidates = unseen.length ? unseen : puzzles;

  return candidates.reduce((closest, entry) => {
    if (!closest) return entry;

    const distance = Math.abs(Number(entry.puzzle?.rating ?? 1500) - targetRating);
    const closestDistance = Math.abs(Number(closest.puzzle?.rating ?? 1500) - targetRating);
    return distance < closestDistance ? entry : closest;
  }, null);
}

export async function createPuzzleAttempt({ user, rating }) {
  const difficulty = difficultyForRating(rating);
  const [puzzles, recentPuzzleIds] = await Promise.all([
    fetchLichessBatch(difficulty),
    redis.lrange(recentKey(user.id), 0, RECENT_LIMIT - 1),
  ]);
  const selected = closestPuzzle(puzzles, rating, new Set(recentPuzzleIds));

  if (!selected?.puzzle?.id || !selected.puzzle.solution?.length) {
    throw new HttpError(503, "No playable puzzle is available right now.");
  }

  const initialFen = puzzlePosition(selected);
  const solution = solutionDetails(initialFen, selected.puzzle.solution);
  const attemptId = crypto.randomUUID();
  const attempt = {
    id: attemptId,
    userId: user.id,
    puzzleId: selected.puzzle.id,
    puzzleRating: Number(selected.puzzle.rating ?? 1500),
    themes: selected.puzzle.themes || [],
    initialFen,
    fen: initialFen,
    solution,
    cursor: 0,
    startedAt: Date.now(),
    finished: false,
    result: null,
  };

  await Promise.all([
    redis.setex(attemptKey(attemptId), ATTEMPT_TTL_SECONDS, JSON.stringify(attempt)),
    redis.setex(activeAttemptKey(user.id), ATTEMPT_TTL_SECONDS, attemptId),
    rememberPuzzle(user.id, selected.puzzle.id),
  ]);

  return publicPuzzleAttempt(attempt);
}

export function publicPuzzleAttempt(attempt) {
  return {
    attemptId: attempt.id,
    puzzleId: attempt.puzzleId,
    puzzleRating: attempt.puzzleRating,
    themes: attempt.themes,
    initialFen: attempt.initialFen,
    fen: attempt.fen,
    orientation: attempt.initialFen.split(" ")[1] === "b" ? "black" : "white",
  };
}

export async function getActivePuzzleAttempt(userId) {
  const key = activeAttemptKey(userId);
  const attemptId = await redis.get(key);

  if (!attemptId) return null;

  const attempt = await getPuzzleAttempt(attemptId);

  if (!attempt || attempt.finished) {
    await redis.del(key);
    return null;
  }

  return attempt;
}

export async function getPuzzleAttempt(attemptId) {
  const raw = await redis.get(attemptKey(attemptId));
  return raw ? JSON.parse(raw) : null;
}

export async function savePuzzleAttempt(attempt) {
  const pipeline = redis.pipeline();
  pipeline.setex(attemptKey(attempt.id), ATTEMPT_TTL_SECONDS, JSON.stringify(attempt));

  if (attempt.finished) {
    pipeline.del(activeAttemptKey(attempt.userId));
  } else {
    pipeline.setex(activeAttemptKey(attempt.userId), ATTEMPT_TTL_SECONDS, attempt.id);
  }

  await pipeline.exec();
}

export async function withPuzzleAttemptLock(attemptId, work) {
  const key = `puzzle:attempt-lock:${attemptId}`;
  const acquired = await redis.set(key, "1", "PX", 5000, "NX");

  if (!acquired) {
    throw new HttpError(409, "That puzzle move is already being processed.");
  }

  try {
    return await work();
  } finally {
    await redis.del(key);
  }
}

export async function withPuzzleUserLock(userId, work) {
  const key = `puzzle:user-lock:${userId}`;
  const deadline = Date.now() + 10_000;
  let acquired = null;

  while (!acquired && Date.now() < deadline) {
    acquired = await redis.set(key, "1", "PX", 15_000, "NX");

    if (!acquired) {
      await new Promise((resolve) => setTimeout(resolve, 75));
    }
  }

  if (!acquired) {
    throw new HttpError(409, "A puzzle is already being prepared. Try again.");
  }

  try {
    return await work();
  } finally {
    await redis.del(key);
  }
}

export function playPuzzleMove(attempt, requestedUci) {
  const expected = attempt.solution[attempt.cursor];
  const normalizedUci = String(requestedUci || "").trim().toLowerCase();

  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(normalizedUci)) {
    throw new HttpError(400, "Submit a valid move.");
  }

  if (!expected || normalizedUci !== expected.uci) {
    return {
      solved: false,
      finished: true,
      fen: attempt.fen,
    };
  }

  const chess = new Chess(attempt.fen);
  const playerMove = moveFromUci(chess, normalizedUci);

  if (!playerMove) {
    throw new HttpError(400, "That move is not legal.");
  }

  attempt.cursor += 1;
  attempt.fen = chess.fen();

  if (attempt.cursor >= attempt.solution.length) {
    return {
      solved: true,
      finished: true,
      fen: attempt.fen,
      playerMove: { uci: normalizedUci, san: playerMove.san },
    };
  }

  const reply = attempt.solution[attempt.cursor];
  const replyMove = moveFromUci(chess, reply.uci);

  if (!replyMove) {
    throw new Error(`Invalid puzzle reply: ${reply.uci}`);
  }

  attempt.cursor += 1;
  attempt.fen = chess.fen();

  return {
    solved: false,
    finished: false,
    fen: attempt.fen,
    playerMove: { uci: normalizedUci, san: playerMove.san },
    opponentMove: { uci: reply.uci, san: replyMove.san },
  };
}

export function revealPuzzle(attempt) {
  return {
    solved: false,
    finished: true,
    fen: attempt.fen,
  };
}

export function publicPuzzleSolution(attempt) {
  return attempt.solution.map(({ uci, san }) => ({ uci, san }));
}
