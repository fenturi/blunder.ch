import express from "express";
import { config } from "../config.js";
import {
  getUserByDeviceId,
  getUserByEmail,
  getUserByProfileSlug,
  getUserByProviderUsername,
  redeemPremium,
  updateUserAvatar,
  upsertUser,
} from "../repositories/usersRepository.js";
import { hashPassword, verifyPassword } from "../utils/hash.js";
import { publicProfile, publicUser } from "../utils/publicUser.js";

export const usersRouter = express.Router();
const avatarPresets = new Set([
  "white-knight",
  "black-knight",
  "white-bishop",
  "black-bishop",
  "white-rook",
  "black-rook",
]);
const customAvatarPattern = /^data:image\/(?:png|jpeg|webp|gif);base64,[a-z0-9+/=\r\n]+$/i;
const maxCustomAvatarLength = 700_000;

function parseIdentity(source) {
  const provider = source.provider?.toLowerCase();
  const username = source.username?.trim();

  if (!["chess.com", "lichess"].includes(provider) || !username) {
    return null;
  }

  return { provider, username };
}

function parseDeviceId(source) {
  const deviceId = source.deviceId?.trim();
  return deviceId && deviceId.length <= 128 ? deviceId : null;
}

function isUniqueDeviceError(error) {
  return error.code === "23505" && error.constraint === "users_device_id_unique_idx";
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

usersRouter.get("/profile/:profileSlug", async (req, res, next) => {
  try {
    const profileSlug = req.params.profileSlug?.trim();
    const user = profileSlug ? await getUserByProfileSlug(profileSlug) : null;

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json(publicProfile(user));
  } catch (error) {
    next(error);
  }
});

usersRouter.patch("/profile", async (req, res, next) => {
  try {
    const identity = parseIdentity(req.body);

    if (!identity) {
      return res.status(400).json({ error: "provider and username are required" });
    }

    const user = await getUserByProviderUsername(identity);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const avatarPreset = req.body.avatarPreset?.trim();
    const avatarDataUrl = req.body.avatarDataUrl?.trim() || null;

    if (avatarDataUrl) {
      if (!user.is_premium) {
        return res.status(403).json({ error: "Custom profile pictures require Pro." });
      }

      if (
        avatarDataUrl.length > maxCustomAvatarLength
        || !customAvatarPattern.test(avatarDataUrl)
      ) {
        return res.status(400).json({ error: "Use a PNG, JPEG, WebP, or GIF under 500 KB." });
      }
    } else if (!avatarPresets.has(avatarPreset)) {
      return res.status(400).json({ error: "Select a valid profile picture." });
    }

    const updatedUser = await updateUserAvatar({
      ...identity,
      avatarPreset: avatarDataUrl ? user.avatar_preset || "white-knight" : avatarPreset,
      avatarDataUrl,
    });

    return res.json(publicUser(updatedUser));
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
    const deviceId = parseDeviceId(req.body);

    if (!identity || !email || password.length < 8 || !deviceId) {
      return res.status(400).json({
        error: "provider, username, email, an 8+ character password, and device id are required",
      });
    }

    const existingUser = await getUserByProviderUsername(identity);

    if (existingUser) {
      return res.status(409).json({ error: "Account already exists. Log in to upgrade." });
    }

    const existingDeviceUser = await getUserByDeviceId(deviceId);

    if (existingDeviceUser) {
      return res.status(409).json({ error: "This device has already created an account. Please log in with that account." });
    }

    let user;
    try {
      user = await upsertUser({
        ...identity,
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
