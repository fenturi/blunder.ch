import { Chess } from "chess.js";
import { upsertGame } from "../repositories/gamesRepository.js";
import { setImportStatus } from "../repositories/importsRepository.js";
import { fetchChessDotComGames, validateChessDotComUsername } from "./chessDotComService.js";
import { fetchLichessGames, validateLichessUsername } from "./lichessService.js";
import { sha256 } from "../utils/hash.js";
import { analysisQueue } from "../queue.js";
import { logInfo } from "../utils/logger.js";

const RECENT_ANALYSIS_LIMIT = 5;
const MAX_IMPORT_CANDIDATES = 100;

function candidateLimitForGameCount(gameCount) {
  return Math.max(gameCount, Math.min(MAX_IMPORT_CANDIDATES, gameCount * 20));
}

function sinceForDateRange(dateRange) {
  const days = {
    "30d": 30,
    "90d": 90,
    "180d": 180,
  }[dateRange];

  return days ? Date.now() - days * 24 * 60 * 60 * 1000 : null;
}

export async function validateExternalUsername({ provider, username }) {
  const valid =
    provider === "chess.com"
      ? await validateChessDotComUsername(username)
      : await validateLichessUsername(username);

  return valid
    ? { valid: true }
    : { valid: false, message: "No account found for that platform username" };
}

function extractHeaders(pgn) {
  const headers = {};
  const tagPattern = /^\[([A-Za-z0-9_]+)\s+"([^"]*)"\]$/gm;
  let match;

  while ((match = tagPattern.exec(pgn)) !== null) {
    headers[match[1]] = match[2];
  }

  if (Object.keys(headers).length > 0) {
    return headers;
  }

  const chess = new Chess();
  chess.loadPgn(pgn);
  return chess.header();
}

function parsePgnDate(dateValue) {
  if (!dateValue || typeof dateValue !== "string") return null;

  const normalized = dateValue.replace(/\?/g, "01").replace(/\./g, "-");
  const parsed = new Date(normalized);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeGameRecord(rawGame) {
  const headers = extractHeaders(rawGame.pgn);

  return {
    ...rawGame,
    providerGameId: rawGame.providerGameId ?? headers.Site ?? null,
    playedAt: rawGame.playedAt ?? parsePgnDate(headers.Date),
    whitePlayer: rawGame.whitePlayer || headers.White || "",
    blackPlayer: rawGame.blackPlayer || headers.Black || "",
    result: rawGame.result || headers.Result || "",
    timeControl: rawGame.timeControl || headers.TimeControl || "",
    sourceUrl: rawGame.sourceUrl || headers.Site || "",
  };
}

export async function importGamesForUser({
  importId,
  userId,
  provider,
  username,
  gameTypes = ["rapid", "blitz"],
  gameCount = RECENT_ANALYSIS_LIMIT,
  dateRange = "30d",
  plan = "free",
}) {
  await setImportStatus(importId, "running");

  const requestedGameCount = Math.max(1, Number(gameCount) || RECENT_ANALYSIS_LIMIT);
  const importOptions = {
    gameTypes,
    gameCount: requestedGameCount,
    fetchLimit: candidateLimitForGameCount(requestedGameCount),
    dateRange,
    plan,
  };
  const rawGames =
    provider === "chess.com"
      ? await fetchChessDotComGames(username, importOptions)
      : await fetchLichessGames(username, importOptions);

  let skipped = 0;
  const normalizedGames = [];

  for (const rawGame of rawGames) {
    try {
      normalizedGames.push(normalizeGameRecord(rawGame));
    } catch (error) {
      skipped += 1;
      logInfo("import-game-skipped", {
        importId,
        provider,
        username,
        sourceUrl: rawGame.sourceUrl ?? null,
        reason: error.message,
      });
    }
  }

  const since = sinceForDateRange(dateRange);
  const filteredGames = since
    ? normalizedGames.filter((game) => !game.playedAt || new Date(game.playedAt).getTime() >= since)
    : normalizedGames;

  filteredGames.sort((left, right) => {
    const leftTime = left.playedAt ? new Date(left.playedAt).getTime() : 0;
    const rightTime = right.playedAt ? new Date(right.playedAt).getTime() : 0;
    return rightTime - leftTime;
  });

  let inserted = 0;
  let duplicates = 0;
  let processed = 0;

  for (const game of filteredGames) {
    if (inserted >= requestedGameCount) break;

    const record = await upsertGame({
      importId,
      userId,
      provider,
      providerGameId: game.providerGameId,
      pgn: game.pgn,
      pgnHash: sha256(game.pgn),
      playedAt: game.playedAt,
      whitePlayer: game.whitePlayer,
      blackPlayer: game.blackPlayer,
      result: game.result,
      timeControl: game.timeControl,
      sourceUrl: game.sourceUrl,
    });
    processed += 1;

    if (record.inserted) {
      inserted += 1;
    } else {
      duplicates += 1;
    }

    if (record.analysis_status !== "completed") {
      await analysisQueue.add(
        "analyze-game",
        { gameId: record.id },
        { jobId: `analyze-${record.id}-${importId}` }
      );
    }
  }

  await setImportStatus(importId, "completed", {
    gameCount: inserted,
    totalGames: processed,
    importedGames: inserted,
    duplicateGames: duplicates,
    failedReason: skipped > 0 ? `Skipped ${skipped} malformed PGN(s)` : null,
  });

  return {
    totalGames: rawGames.length,
    importedGames: inserted,
    duplicateGames: duplicates,
    skippedGames: skipped,
  };
}
