import express from "express";
import { config } from "./config.js";
import { analysisRouter } from "./routes/analysis.js";
import { billingRouter, billingWebhookRouter } from "./routes/billing.js";
import { importsRouter } from "./routes/imports.js";
import { gamesRouter } from "./routes/games.js";
import { openingsRouter } from "./routes/openings.js";
import { usersRouter } from "./routes/users.js";
import { validationRouter } from "./routes/validation.js";
import { devRouter } from "./routes/dev.js";

export function createApp() {
  const app = express();

  app.use((req, res, next) => {
    const origin = req.get("origin");
    const allowedOrigins = config.corsOrigins;

    if (origin && (allowedOrigins.includes("*") || allowedOrigins.includes(origin))) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type,Stripe-Signature");
    }

    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }

    return next();
  });

  app.use("/api/billing/webhook", express.raw({ type: "application/json" }), billingWebhookRouter);
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api", validationRouter);
  app.use("/api/analysis", analysisRouter);
  app.use("/api/imports", importsRouter);
  app.use("/api/games", gamesRouter);
  app.use("/api/openings", openingsRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/billing", billingRouter);

  if (process.env.NODE_ENV !== "production") {
    app.use("/api/dev", devRouter);
  }

  app.use((error, _req, res, _next) => {
    const status = error.status ?? 500;
    res.status(status).json({
      error: error.message ?? "Internal server error",
      details: error.details ?? null,
    });
  });

  return app;
}
