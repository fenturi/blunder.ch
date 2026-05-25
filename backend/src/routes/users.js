import express from "express";
import { config } from "../config.js";
import {
  getUserByEmail,
  getUserByProviderUsername,
  redeemPremium,
  upsertUser,
} from "../repositories/usersRepository.js";
import { hashPassword, verifyPassword } from "../utils/hash.js";
import { publicUser } from "../utils/publicUser.js";

export const usersRouter = express.Router();

function parseIdentity(source) {
  const provider = source.provider?.toLowerCase();
  const username = source.username?.trim();

  if (!["chess.com", "lichess"].includes(provider) || !username) {
    return null;
  }

  return { provider, username };
}

usersRouter.get("/status", async (req, res, next) => {
  try {
    const identity = parseIdentity(req.query);

    if (!identity) {
      return res.status(400).json({
        error: "provider and username query parameters are required",
      });
    }

    const user = await getUserByProviderUsername(identity);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json(publicUser(user));
  } catch (error) {
    next(error);
  }
});

usersRouter.post("/login", async (req, res, next) => {
  try {
    const email = req.body.email?.trim();
    const password = req.body.password ?? "";

    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const user = await getUserByEmail(email);

    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: "invalid email or password" });
    }

    return res.json(publicUser(user));
  } catch (error) {
    next(error);
  }
});

usersRouter.post("/register", async (req, res, next) => {
  try {
    const identity = parseIdentity(req.body);
    const email = req.body.email?.trim();
    const password = req.body.password ?? "";

    if (!identity || !email || password.length < 8) {
      return res.status(400).json({
        error: "provider, username, email, and an 8+ character password are required",
      });
    }

    const existingUser = await getUserByProviderUsername(identity);

    if (existingUser) {
      return res.status(409).json({ error: "Account already exists. Log in to upgrade." });
    }

    const user = await upsertUser({
      ...identity,
      email,
      passwordHash: hashPassword(password),
      isPremium: false,
    });

    return res.status(201).json(publicUser(user));
  } catch (error) {
    next(error);
  }
});

usersRouter.post("/redeem-code", async (req, res, next) => {
  try {
    const identity = parseIdentity(req.body);
    const code = req.body.code?.trim();

    if (!identity || !code) {
      return res.status(400).json({
        error: "provider, username, and code are required",
      });
    }

    if (code.toLowerCase() !== config.premiumRedeemCode.toLowerCase()) {
      return res.status(400).json({ error: "invalid code" });
    }

    const user = await redeemPremium(identity);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json(publicUser(user));
  } catch (error) {
    next(error);
  }
});
