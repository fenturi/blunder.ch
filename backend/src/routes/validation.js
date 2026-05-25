import express from "express";
import { validateExternalUsername } from "../services/gameImportService.js";

export const validationRouter = express.Router();

validationRouter.get("/validate-username", async (req, res, next) => {
  try {
    const provider = req.query.provider?.toLowerCase();
    const username = req.query.username?.trim();

    if (!["chess.com", "lichess"].includes(provider) || !username) {
      return res.status(400).json({
        valid: false,
        message: "provider and username query parameters are required",
      });
    }

    const result = await validateExternalUsername({ provider, username });
    return res.status(result.valid ? 200 : 404).json(result);
  } catch (error) {
    next(error);
  }
});
