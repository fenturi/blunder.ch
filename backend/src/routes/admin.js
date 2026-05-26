import crypto from "node:crypto";
import express from "express";
import { config } from "../config.js";
import { pool } from "../db.js";
import { analysisQueue, importQueue } from "../queue.js";

export const adminRouter = express.Router();

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ""), "utf8");
  const rightBuffer = Buffer.from(String(right || ""), "utf8");

  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function requireResetCode(code) {
  if (!config.resetDatabaseCode || config.resetDatabaseCode.length < 32) {
    const error = new Error("Database reset is not configured");
    error.status = 404;
    throw error;
  }

  if (!safeEqual(code, config.resetDatabaseCode)) {
    const error = new Error("Invalid reset code");
    error.status = 403;
    throw error;
  }
}

async function clearQueues() {
  await Promise.all([
    importQueue.pause(),
    analysisQueue.pause(),
  ]);

  try {
    await Promise.all([
      importQueue.obliterate({ force: true }),
      analysisQueue.obliterate({ force: true }),
    ]);
  } finally {
    await Promise.all([
      importQueue.resume(),
      analysisQueue.resume(),
    ]);
  }
}

adminRouter.post("/reset-database", async (req, res, next) => {
  try {
    requireResetCode(req.body?.code);

    await clearQueues();
    await pool.query("truncate table move_annotations, games, imports, users restart identity cascade");

    return res.json({
      ok: true,
      reset: ["move_annotations", "games", "imports", "users"],
      queues: ["imports", "analysis"],
    });
  } catch (error) {
    next(error);
  }
});
