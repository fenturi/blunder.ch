import dotenv from "dotenv";

dotenv.config();

function required(name, fallback = "") {
  const value = process.env[name] ?? fallback;

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function integer(name, fallback) {
  const raw = process.env[name] ?? fallback;
  const value = Number.parseInt(raw, 10);

  if (Number.isNaN(value)) {
    throw new Error(`Environment variable ${name} must be an integer`);
  }

  return value;
}

function list(name, fallback = "") {
  const raw = process.env[name] ?? fallback;
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function normalizeOrigin(value) {
  if (value === "*") return value;

  try {
    const url = new URL(value);
    return url.origin;
  } catch {
    return value.replace(/\/+$/, "");
  }
}

function withDomainAliases(origins) {
  const expanded = new Set();

  for (const origin of origins) {
    const normalized = normalizeOrigin(origin);
    expanded.add(normalized);

    if (normalized === "*") continue;

    try {
      const url = new URL(normalized);
      const aliases = url.hostname.startsWith("www.")
        ? [url.hostname.slice(4)]
        : [`www.${url.hostname}`];

      for (const hostname of aliases) {
        const alias = new URL(normalized);
        alias.hostname = hostname;
        expanded.add(alias.origin);
      }
    } catch {
      // Ignore non-URL origins after adding their normalized value.
    }
  }

  return [...expanded];
}

const defaultCorsOrigins = "http://localhost:5173,https://blunder.ch,https://www.blunder.ch";
const configuredCorsOrigins = [
  ...list("CORS_ORIGINS", defaultCorsOrigins),
  ...list("PUBLIC_APP_URL"),
];

export const config = {
  env: process.env.NODE_ENV ?? "development",
  port: integer("PORT", "4000"),
  databaseUrl: required("DATABASE_URL"),
  redisUrl: required("REDIS_URL"),
  stockfishPath: required("STOCKFISH_PATH", "stockfish"),
  engineDepth: integer("ENGINE_DEPTH", "14"),
  llmApiKey: process.env.LLM_API_KEY ?? "",
  llmBaseUrl: process.env.LLM_BASE_URL ?? "",
  llmModel: process.env.LLM_MODEL ?? "gpt-4.1-mini",
  lichessToken: process.env.LICHESS_TOKEN ?? "",
  importConcurrency: integer("IMPORT_CONCURRENCY", "2"),
  analysisConcurrency: integer("ANALYSIS_CONCURRENCY", "1"),
  premiumRedeemCode: process.env.PREMIUM_REDEEM_CODE ?? "premium",
  publicAppUrl: process.env.PUBLIC_APP_URL ?? "",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  stripePriceId: process.env.STRIPE_PRICE_ID ?? "",
  stripeCurrency: (process.env.STRIPE_CURRENCY ?? "usd").toLowerCase(),
  stripeProAmountCents: integer("STRIPE_PRO_AMOUNT_CENTS", "999"),
  corsOrigins: withDomainAliases(configuredCorsOrigins),
  chessDotComUserAgent:
    process.env.CHESS_DOT_COM_USER_AGENT ?? "blunder.app/0.1 support@example.com",
};
