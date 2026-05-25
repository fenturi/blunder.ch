import { Chess } from "chess.js";
import express from "express";
import { config } from "../config.js";
import { evaluateLines } from "../services/stockfishService.js";

export const analysisRouter = express.Router();

function moveToSanLine(fen, pv) {
  const chess = new Chess(fen);
  const san = [];

  for (const uci of pv) {
    try {
      const move = chess.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci[4],
      });

      if (!move) break;
      san.push(move.san);
    } catch {
      break;
    }
  }

  return san;
}

function normalizeLine(line, fen) {
  const turn = fen.split(" ")[1] || "w";
  const whiteCp = turn === "w" ? line.evaluation : -line.evaluation;
  const whiteMate = line.mate === null || line.mate === undefined
    ? null
    : turn === "w" ? line.mate : -line.mate;

  return {
    multipv: line.multipv,
    move: line.move,
    pv: line.pv,
    san: moveToSanLine(fen, line.pv),
    evaluation: whiteCp,
    mate: whiteMate,
    depth: line.depth,
  };
}

function moveRequestFromBody(body) {
  const uci = String(body?.uci || "").trim().toLowerCase();

  if (uci) {
    return {
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci[4] || body?.promotion,
    };
  }

  return {
    from: String(body?.from || "").trim().toLowerCase(),
    to: String(body?.to || "").trim().toLowerCase(),
    promotion: body?.promotion,
  };
}

function promotionForMove(chess, moveRequest) {
  if (moveRequest.promotion) return String(moveRequest.promotion).trim().toLowerCase()[0];

  const piece = chess.get(moveRequest.from);
  const targetRank = moveRequest.to?.[1];

  if (piece?.type === "p" && (targetRank === "1" || targetRank === "8")) {
    return "q";
  }

  return undefined;
}

analysisRouter.get("/lines", async (req, res, next) => {
  try {
    const fen = String(req.query.fen || "").trim();
    const limit = Math.max(1, Math.min(5, Number.parseInt(req.query.limit || "2", 10) || 2));
    const depth = Math.max(1, Math.min(24, Number.parseInt(req.query.depth || String(config.engineDepth), 10) || config.engineDepth));

    if (!fen) {
      return res.status(400).json({ error: "fen query parameter is required" });
    }

    try {
      new Chess(fen);
    } catch {
      return res.status(400).json({ error: "fen query parameter is invalid" });
    }

    const evaluation = await evaluateLines(fen, { multiPv: limit, depth });

    return res.json({
      fen,
      depth: Math.max(...evaluation.lines.map((line) => line.depth), evaluation.depth || depth),
      lines: evaluation.lines.slice(0, limit).map((line) => normalizeLine(line, fen)),
    });
  } catch (error) {
    next(error);
  }
});

analysisRouter.post("/move", (req, res) => {
  const fen = String(req.body?.fen || "").trim();

  if (!fen) {
    return res.status(400).json({ error: "fen is required" });
  }

  let chess;
  try {
    chess = new Chess(fen);
  } catch {
    return res.status(400).json({ error: "fen is invalid" });
  }

  const moveRequest = moveRequestFromBody(req.body);

  if (!/^[a-h][1-8]$/.test(moveRequest.from) || !/^[a-h][1-8]$/.test(moveRequest.to)) {
    return res.status(400).json({ error: "move squares are invalid" });
  }

  try {
    const move = chess.move({
      from: moveRequest.from,
      to: moveRequest.to,
      promotion: promotionForMove(chess, moveRequest),
    });

    if (!move) {
      return res.status(400).json({ error: "move is illegal" });
    }

    const uci = `${move.from}${move.to}${move.promotion || ""}`;

    return res.json({
      fenBefore: fen,
      fenAfter: chess.fen(),
      uci,
      san: move.san,
      from: move.from,
      to: move.to,
      promotion: move.promotion || null,
    });
  } catch {
    return res.status(400).json({ error: "move is illegal" });
  }
});
