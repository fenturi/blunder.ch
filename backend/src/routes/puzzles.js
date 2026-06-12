import express from "express";
import { getUserByProviderUsername } from "../repositories/usersRepository.js";
import {
  claimPuzzleSlot,
  puzzleProgress,
  recordPuzzleResult,
  refundPuzzleSlot,
} from "../repositories/puzzlesRepository.js";
import {
  createPuzzleAttempt,
  getActivePuzzleAttempt,
  getPuzzleAttempt,
  playPuzzleMove,
  publicPuzzleAttempt,
  publicPuzzleSolution,
  revealPuzzle,
  savePuzzleAttempt,
  withPuzzleAttemptLock,
  withPuzzleUserLock,
} from "../services/puzzleService.js";

export const puzzlesRouter = express.Router();

async function requirePuzzleUser(req, res) {
  const source = { ...req.query, ...req.body };
  const provider = source.provider?.toLowerCase();
  const username = source.username?.trim();

  if (!["chess.com", "lichess"].includes(provider) || !username) {
    res.status(400).json({ error: "provider and username are required" });
    return null;
  }

  const user = await getUserByProviderUsername({ provider, username });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return null;
  }

  return user;
}

function assertAttemptOwner(attempt, user) {
  if (!attempt) {
    const error = new Error("This puzzle expired. Load another one.");
    error.status = 410;
    throw error;
  }

  if (attempt.userId !== user.id) {
    const error = new Error("Puzzle attempt not found");
    error.status = 404;
    throw error;
  }
}

async function finishAttempt({ attempt, user, solved }) {
  if (attempt.finished && attempt.result) return attempt.result;

  const elapsedMs = Math.max(0, Date.now() - attempt.startedAt);
  const progress = await recordPuzzleResult({
    userId: user.id,
    attemptId: attempt.id,
    puzzleRating: attempt.puzzleRating,
    solved,
    elapsedMs,
  });
  const result = {
    finished: true,
    solved,
    fen: attempt.fen,
    elapsedMs,
    puzzleRating: attempt.puzzleRating,
    ratingBefore: progress.rating - progress.delta,
    ratingAfter: progress.rating,
    ratingDelta: progress.delta,
    speedBonus: progress.speedBonus,
    attempts: progress.attempts,
    solvedCount: progress.solved,
    quota: progress.quota,
    solution: publicPuzzleSolution(attempt),
  };

  attempt.finished = true;
  attempt.result = result;
  await savePuzzleAttempt(attempt);
  return result;
}

puzzlesRouter.get("/status", async (req, res, next) => {
  try {
    const user = await requirePuzzleUser(req, res);
    if (!user) return;

    res.json(puzzleProgress(user));
  } catch (error) {
    next(error);
  }
});

puzzlesRouter.get("/next", async (req, res, next) => {
  try {
    const user = await requirePuzzleUser(req, res);
    if (!user) return;

    const response = await withPuzzleUserLock(user.id, async () => {
      const activeAttempt = await getActivePuzzleAttempt(user.id);

      if (activeAttempt) {
        const refreshedUser = await getUserByProviderUsername({
          provider: user.provider,
          username: user.username,
        });

        return {
          ...publicPuzzleAttempt(activeAttempt),
          user: puzzleProgress(refreshedUser),
          resumed: true,
        };
      }

      const slot = await claimPuzzleSlot(user.id);
      let puzzle;

      try {
        puzzle = await createPuzzleAttempt({
          user,
          rating: slot.progress.rating,
        });
      } catch (error) {
        if (slot.claimed) await refundPuzzleSlot(user.id);
        throw error;
      }

      return {
        ...puzzle,
        user: slot.progress,
      };
    });

    res.json(response);
  } catch (error) {
    next(error);
  }
});

puzzlesRouter.post("/move", async (req, res, next) => {
  try {
    const user = await requirePuzzleUser(req, res);
    if (!user) return;

    const attemptId = String(req.body.attemptId || "").trim();

    if (!attemptId) {
      return res.status(400).json({ error: "attemptId is required" });
    }

    const response = await withPuzzleAttemptLock(attemptId, async () => {
      const attempt = await getPuzzleAttempt(attemptId);
      assertAttemptOwner(attempt, user);

      if (attempt.finished && attempt.result) return attempt.result;

      const moveResult = playPuzzleMove(attempt, req.body.uci);
      attempt.fen = moveResult.fen;

      if (moveResult.finished) {
        return finishAttempt({
          attempt,
          user,
          solved: moveResult.solved,
        });
      }

      await savePuzzleAttempt(attempt);
      return moveResult;
    });

    return res.json(response);
  } catch (error) {
    next(error);
  }
});

puzzlesRouter.post("/reveal", async (req, res, next) => {
  try {
    const user = await requirePuzzleUser(req, res);
    if (!user) return;

    const attemptId = String(req.body.attemptId || "").trim();

    if (!attemptId) {
      return res.status(400).json({ error: "attemptId is required" });
    }

    const response = await withPuzzleAttemptLock(attemptId, async () => {
      const attempt = await getPuzzleAttempt(attemptId);
      assertAttemptOwner(attempt, user);

      if (attempt.finished && attempt.result) return attempt.result;

      const revealResult = revealPuzzle(attempt);
      attempt.fen = revealResult.fen;
      return finishAttempt({ attempt, user, solved: false });
    });

    return res.json(response);
  } catch (error) {
    next(error);
  }
});
