import { fetchText } from "../utils/http.js";

function splitPgnBundle(bundle) {
  return bundle
    .split(/\n(?=\[Event )/g)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function sinceForDateRange(dateRange) {
  const days = {
    "30d": 30,
    "90d": 90,
    "180d": 180,
  }[dateRange];

  return days ? Date.now() - days * 24 * 60 * 60 * 1000 : null;
}

export async function validateLichessUsername(username) {
  const response = await fetch(`https://lichess.org/api/user/${username}`, {
    headers: {
      Accept: "application/json",
    },
  });

  return response.ok;
}

export async function fetchLichessGames(username, options = {}) {
  const params = new URLSearchParams({
    pgnInJson: "false",
    clocks: "true",
    evals: "false",
    opening: "true",
    sort: "dateDesc",
  });
  const since = sinceForDateRange(options.dateRange);

  if (options.gameTypes?.length) {
    params.set("perfType", options.gameTypes.join(","));
  }

  if (since) {
    params.set("since", String(since));
    params.set("until", String(Date.now()));
  }

  if (options.fetchLimit || options.gameCount) {
    params.set("max", String(options.fetchLimit || options.gameCount));
  }

  const bundle = await fetchText(`https://lichess.org/api/games/user/${username}?${params.toString()}`, {
    headers: {
      Accept: "application/x-chess-pgn",
    },
  });

  return splitPgnBundle(bundle).map((pgn, index) => ({
    provider: "lichess",
    providerGameId: `${username}-${index}`,
    playedAt: null,
    whitePlayer: "",
    blackPlayer: "",
    result: "",
    timeControl: "",
    sourceUrl: `https://lichess.org/@/${username}`,
    pgn,
  }));
}
