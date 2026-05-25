import express from "express";
import { createImportRecord, getDailyPlanUsage, getImportById } from "../repositories/importsRepository.js";
import { getUserByDeviceId, getUserByProviderUsername, upsertUser } from "../repositories/usersRepository.js";
import { importQueue } from "../queue.js";
import { hashPassword } from "../utils/hash.js";

export const importsRouter = express.Router();

const PLAN_LIMITS = {
  free: 5,
  pro: 20,
};
const allowedGameTypes = new Set(["rapid", "blitz", "bullet", "classical", "correspondence"]);
const allowedDateRanges = new Set(["30d", "90d", "180d", "all"]);

function normalizeImportOptions(body) {
  const plan = body.plan === "pro" ? "pro" : "free";
  const requestedTypes = Array.isArray(body.gameTypes) ? body.gameTypes : ["rapid", "blitz"];
  let gameTypes = requestedTypes
    .map((type) => String(type).toLowerCase())
    .filter((type) => allowedGameTypes.has(type));

  if (gameTypes.length === 0) {
    gameTypes = ["rapid", "blitz"];
  }

  let gameCount = Number.parseInt(body.gameCount ?? PLAN_LIMITS[plan], 10);
  if (Number.isNaN(gameCount)) gameCount = PLAN_LIMITS[plan];

  const dateRange = allowedDateRanges.has(body.dateRange) ? body.dateRange : "all";

  if (plan === "free") {
    gameCount = Math.min(gameCount, PLAN_LIMITS.free);
  } else {
    gameCount = Math.min(gameCount, PLAN_LIMITS.pro);
  }

  return {
    gameTypes,
    gameCount: Math.max(1, gameCount),
    dateRange,
    plan,
  };
}

function parseDeviceId(source) {
  const deviceId = source.deviceId?.trim();
  return deviceId && deviceId.length <= 128 ? deviceId : null;
}

function isUniqueDeviceError(error) {
  return error.code === "23505" && error.constraint === "users_device_id_unique_idx";
}

importsRouter.get("/allowance/status", async (req, res, next) => {
  try {
    const provider = req.query.provider?.toLowerCase();
    const username = req.query.username?.trim();

    if (!["chess.com", "lichess"].includes(provider) || !username) {
      return res.status(400).json({ error: "provider and username are required" });
    }

    const user = await getUserByProviderUsername({ provider, username });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const freeUsage = await getDailyPlanUsage(user.id, "free");
    const proUsage = await getDailyPlanUsage(user.id, "pro");

    return res.json({
      isPremium: user.is_premium,
      freeLimit: PLAN_LIMITS.free,
      freeUsed: freeUsage.used,
      freeRemaining: Math.max(0, PLAN_LIMITS.free - freeUsage.used),
      freeResetAt: freeUsage.resetAt,
      proLimit: PLAN_LIMITS.pro,
      proUsed: proUsage.used,
      proRemaining: Math.max(0, PLAN_LIMITS.pro - proUsage.used),
      proResetAt: proUsage.resetAt,
    });
  } catch (error) {
    next(error);
  }
});

importsRouter.post("/", async (req, res, next) => {
  try {
    const provider = req.body.provider?.toLowerCase();
    const username = req.body.username?.trim();
    const email = req.body.email?.trim();
    const password = req.body.password ?? "";
    const deviceId = parseDeviceId(req.body);
    const options = normalizeImportOptions(req.body);

    if (!["chess.com", "lichess"].includes(provider) || !username) {
      return res.status(400).json({
        error: "provider and username are required",
      });
    }

    let user = await getUserByProviderUsername({ provider, username });

    if (!user) {
      if (!email || password.length < 8 || !deviceId) {
        return res.status(400).json({
          error: "email, an 8+ character password, and device id are required for a new account",
        });
      }

      const existingDeviceUser = await getUserByDeviceId(deviceId);

      if (existingDeviceUser) {
        return res.status(409).json({ error: "This device has already created an account. Please log in with that account." });
      }

      try {
        user = await upsertUser({
          provider,
          username,
          email,
          passwordHash: hashPassword(password),
          isPremium: false,
          deviceId,
        });
      } catch (error) {
        if (isUniqueDeviceError(error)) {
          return res.status(409).json({ error: "This device has already created an account. Please log in with that account." });
        }
        throw error;
      }
    }

    if (options.plan === "pro" && !user.is_premium) {
      return res.status(402).json({
        error: "Upgrade to Pro before importing 20 games.",
      });
    }

    const usage = await getDailyPlanUsage(user.id, options.plan);
    const remaining = Math.max(0, PLAN_LIMITS[options.plan] - usage.used);

    if (remaining <= 0) {
      return res.status(402).json({
        error: `${options.plan === "pro" ? "Pro" : "Regular"} analyses used. The allowance replenishes 24 hours after your first run.`,
      });
    }

    options.gameCount = Math.min(options.gameCount, remaining);

    const importRecord = await createImportRecord({
      userId: user.id,
      provider,
      username,
      ...options,
    });

    await importQueue.add(
      "import-user-games",
      {
        importId: importRecord.id,
        userId: user.id,
        provider,
        username,
        ...options,
      },
      { jobId: `import-${importRecord.id}` }
    );

    return res.status(202).json(importRecord);
  } catch (error) {
    next(error);
  }
});

importsRouter.get("/:id", async (req, res, next) => {
  try {
    const record = await getImportById(req.params.id);

    if (!record) {
      return res.status(404).json({ error: "Import not found" });
    }

    return res.json(record);
  } catch (error) {
    next(error);
  }
});
