import { config } from "../config.js";
import { fetchJson, fetchText } from "../utils/http.js";

function buildHeaders() {
  return {
    "User-Agent": config.chessDotComUserAgent,
  };
}

function splitPgnBundle(bundle) {
  return bundle
    .split(/\n(?=\[Event )/g)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function monthKeysForDateRange(dateRange) {
  const now = new Date();
  const months = [];
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const rangeMonths = {
    "30d": 2,
    "90d": 4,
    "180d": 7,
  }[dateRange];

  if (!rangeMonths) return null;

  for (let index = 0; index < rangeMonths; index += 1) {
    const month = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - index, 1));
    months.push({
      year: month.getUTCFullYear(),
      month: String(month.getUTCMonth() + 1).padStart(2, "0"),
    });
  }

  return months;
}

export async function validateChessDotComUsername(username) {
  const response = await fetch(`https://api.chess.com/pub/player/${username}`, {
    headers: buildHeaders(),
  });

  return response.ok;
}

export async function fetchChessDotComGames(username, options = {}) {
  const allowedTypes = new Set(options.gameTypes ?? []);
  const explicitMonths = monthKeysForDateRange(options.dateRange);
  const archiveUrls = explicitMonths
    ? explicitMonths.map(({ year, month }) => `https://api.chess.com/pub/player/${username}/games/${year}/${month}`)
    : (await fetchJson(
        `https://api.chess.com/pub/player/${username}/games/archives`,
        { headers: buildHeaders() }
      )).archives ?? [];

  const games = [];

  for (const url of archiveUrls) {
    let monthData;

    try {
      monthData = await fetchJson(url, { headers: buildHeaders() });
    } catch (error) {
      if (error.status === 404) continue;
      throw error;
    }

    for (const game of monthData.games ?? []) {
      const pgnText = game.pgn?.trim();

      if (!pgnText) continue;
      if (allowedTypes.size > 0 && !allowedTypes.has(game.time_class)) continue;

      games.push({
        provider: "chess.com",
        providerGameId: game.url,
        playedAt: game.end_time ? new Date(game.end_time * 1000) : null,
        whitePlayer: game.white?.username ?? "",
        blackPlayer: game.black?.username ?? "",
        result: game.white?.result ?? "",
        timeControl: game.time_control ?? "",
        sourceUrl: game.url ?? "",
        pgn: pgnText,
      });
    }
  }

  return games;
}

export async function fetchChessDotComGamesFromPgnArchive(username) {
  const archives = await fetchJson(
    `https://api.chess.com/pub/player/${username}/games/archives`,
    { headers: buildHeaders() }
  );

  const games = [];

  for (const archiveUrl of archives.archives ?? []) {
    const pgnBundle = await fetchText(`${archiveUrl}/pgn`, { headers: buildHeaders() });

    for (const pgn of splitPgnBundle(pgnBundle)) {
      games.push({
        provider: "chess.com",
        providerGameId: null,
        playedAt: null,
        whitePlayer: "",
        blackPlayer: "",
        result: "",
        timeControl: "",
        sourceUrl: archiveUrl,
        pgn,
      });
    }
  }

  return games;
}
