import express from "express";
import {
  getDashboardByUser,
  getGameById,
  getLatestAnalyzedGameByUser,
} from "../repositories/gamesRepository.js";

export const gamesRouter = express.Router();

gamesRouter.get("/", async (req, res, next) => {
  try {
    const provider = req.query.provider?.toLowerCase();
    const username = req.query.username?.trim();

    if (!provider || !username) {
      return res.status(400).json({
        error: "provider and username query parameters are required",
      });
    }

    const dashboard = await getDashboardByUser({ provider, username });
    return res.json(dashboard);
  } catch (error) {
    next(error);
  }
});

gamesRouter.get("/latest", async (req, res, next) => {
  try {
    const provider = req.query.provider?.toLowerCase();
    const username = req.query.username?.trim();

    if (!provider || !username) {
      return res.status(400).json({
        error: "provider and username query parameters are required",
      });
    }

    const game = await getLatestAnalyzedGameByUser({ provider, username });

    if (!game) {
      return res.status(404).json({ error: "No analyzed game found" });
    }

    return res.json(game);
  } catch (error) {
    next(error);
  }
});

gamesRouter.get("/:id", async (req, res, next) => {
  try {
    const game = await getGameById(req.params.id);

    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }

    return res.json(game);
  } catch (error) {
    next(error);
  }
});
