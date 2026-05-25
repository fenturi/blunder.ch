import { config } from "../config.js";

const explorerCache = new Map();
const EXPLORER_CACHE_MS = 1000 * 60 * 20;
const EXPLORER_HOSTS = [
  "https://explorer.lichess.ovh",
  "https://explorer.lichess.org",
];

function normalizeFenForExplorer(fen) {
  return String(fen || "").trim();
}

function cacheKey({ source, fen, limit, moves }) {
  return `${source}:${limit}:${moves}:${fen}`;
}

function readCached(key) {
  const cached = explorerCache.get(key);

  if (!cached || Date.now() - cached.createdAt > EXPLORER_CACHE_MS) {
    explorerCache.delete(key);
    return null;
  }

  return cached.payload;
}

function writeCached(key, payload) {
  explorerCache.set(key, {
    createdAt: Date.now(),
    payload,
  });
}

function normalizeSide(side) {
  if (!side) return {};

  return {
    name: side.name || side.user || side.id || "",
    rating: side.rating || side.ratingDiff || null,
  };
}

function normalizeGame(game) {
  const white = normalizeSide(game.white);
  const black = normalizeSide(game.black);

  return {
    id: game.id || "",
    white,
    black,
    winner: game.winner || "",
    result: game.winner === "white" ? "1-0" : game.winner === "black" ? "0-1" : "1/2-1/2",
    year: game.year || game.month?.slice?.(0, 4) || "",
    event: game.event || game.tournament || "",
    url: game.id ? `https://lichess.org/${game.id}` : "",
  };
}

function normalizeMove(move) {
  const white = Number(move.white || 0);
  const draws = Number(move.draws || 0);
  const black = Number(move.black || 0);
  const total = white + draws + black;

  return {
    uci: move.uci || "",
    san: move.san || move.uci || "",
    white,
    draws,
    black,
    total,
    averageRating: move.averageRating || move.average_rating || null,
  };
}

function openingExplorerError(message, status = 502, details = null) {
  const error = new Error(message);
  error.status = status;
  error.details = details;
  return error;
}

export async function getOpeningExplorerPosition({
  fen,
  source = "masters",
  limit = 20,
  moves = 12,
}) {
  const normalizedFen = normalizeFenForExplorer(fen);
  const normalizedSource = source === "lichess" ? "lichess" : "masters";
  const boundedLimit = Math.max(1, Number(limit) || 1);
  const boundedMoves = Math.max(1, Number(moves) || 1);

  if (!normalizedFen) {
    throw openingExplorerError("fen query parameter is required", 400);
  }

  if (!config.lichessToken) {
    throw openingExplorerError(
      "Lichess opening explorer now requires authentication. Set LICHESS_TOKEN in the backend environment.",
      503
    );
  }

  const key = cacheKey({
    source: normalizedSource,
    fen: normalizedFen,
    limit: boundedLimit,
    moves: boundedMoves,
  });
  const cached = readCached(key);

  if (cached) {
    return cached;
  }

  const params = new URLSearchParams({
    fen: normalizedFen,
    moves: String(boundedMoves),
    topGames: String(boundedLimit),
    recentGames: String(boundedLimit),
  });

  if (normalizedSource === "lichess") {
    params.set("speeds", "rapid,classical,blitz");
    params.set("ratings", "2000,2200,2500");
  }

  let response = null;
  let payload = null;

  for (const host of EXPLORER_HOSTS) {
    try {
      response = await fetch(`${host}/${normalizedSource}?${params.toString()}`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${config.lichessToken}`,
          "User-Agent": "blunder2-opening-database/0.1",
        },
      });
      const contentType = response.headers.get("content-type") || "";

      if (!contentType.includes("application/json")) {
        const text = await response.text();
        payload = {
          error: `opening explorer returned ${contentType || "non-JSON"} from ${host}`,
          details: text.slice(0, 120),
        };
        response = null;
        continue;
      }

      payload = await response.json();

      if (response.ok) break;
    } catch (error) {
      response = null;
      payload = { error: error.message };
    }
  }

  if (!response?.ok) {
    const status = response?.status || 502;
    const authMessage = status === 401 || status === 403
      ? "Lichess rejected the opening explorer token. Check LICHESS_TOKEN."
      : payload?.error || "opening explorer request failed";

    throw openingExplorerError(authMessage, status, payload?.details ?? null);
  }

  const games = [...(payload.topGames || []), ...(payload.recentGames || [])]
    .slice(0, boundedLimit)
    .map(normalizeGame);
  const result = {
    source: normalizedSource,
    fen: normalizedFen,
    opening: payload.opening || null,
    totals: {
      white: Number(payload.white || 0),
      draws: Number(payload.draws || 0),
      black: Number(payload.black || 0),
    },
    moves: (payload.moves || []).map(normalizeMove),
    games,
  };

  writeCached(key, result);
  return result;
}

export async function getLichessBookClassification({ fen, playedUci }) {
  const position = await getOpeningExplorerPosition({
    fen,
    source: "lichess",
    limit: 1,
    moves: 12,
  });
  const bookMoves = (position.moves || []).filter((move) => move.uci);
  const matchingMove = bookMoves.find((move) => (
    move.uci.toLowerCase() === String(playedUci || "").toLowerCase()
  ));

  if (!matchingMove) return null;

  return {
    classification: bookMoves.length === 1 ? "only" : "book",
    move: matchingMove,
    opening: position.opening,
  };
}
