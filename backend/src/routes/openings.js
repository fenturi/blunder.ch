import express from "express";
import { getOpeningExplorerPosition } from "../services/openingExplorerService.js";

export const openingsRouter = express.Router();

const MAX_LIMIT = 80;

openingsRouter.get("/explorer", async (req, res, next) => {
  try {
    const source = req.query.source === "lichess" ? "lichess" : "masters";
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number.parseInt(req.query.limit || "20", 10) || 20));
    const result = await getOpeningExplorerPosition({
      fen: req.query.fen,
      source,
      limit,
      moves: 12,
    });

    return res.json(result);
  } catch (error) {
    next(error);
  }
});
