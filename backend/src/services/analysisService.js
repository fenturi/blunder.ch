import { Chess } from "chess.js";
import { pool } from "../db.js";
import { replaceAnnotationsForGame } from "../repositories/annotationsRepository.js";
import { markGameAnalysis } from "../repositories/gamesRepository.js";
import { createStockfishSession } from "./stockfishService.js";
import { getLichessBookClassification } from "./openingExplorerService.js";
import { logInfo } from "../utils/logger.js";

function parseClockComment(comment) {
  const match = comment?.match?.(/\[%clk\s+(\d+):(\d{1,2}):(\d{1,2}(?:\.\d+)?)\]/);

  if (!match) return null;

  const [, hours, minutes, seconds] = match;
  return Math.round(Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds));
}

function clampEval(value) {
  return Math.max(-1500, Math.min(1500, value));
}

const LOST_POSITION_CP = -1000;
const MATE_SCORE_CP = 9000;
const OPENING_BOOK_TOLERANCE_CP = 35;
const OPENING_BOOK_MAX_MOVE = 12;

function stockfishEvalToWhitePov(evaluation, turn) {
  return turn === "w" ? evaluation : -evaluation;
}

function sameUciMove(left, right) {
  return Boolean(left && right && left.toLowerCase() === right.toLowerCase());
}

function calculateCpLoss({ best, played, playedUci }) {
  if (sameUciMove(best.bestMove, playedUci)) {
    return 0;
  }

  const playerEvaluationBefore = best.evaluation;
  const playerEvaluationAfter = -played.evaluation;

  if (playerEvaluationBefore <= LOST_POSITION_CP && playerEvaluationAfter <= -MATE_SCORE_CP) {
    return 0;
  }

  return Math.max(0, playerEvaluationBefore - playerEvaluationAfter);
}

function classifyMove({ cpLoss, forcedMateLost, gamePhase, moveNumber }) {
  if (cpLoss <= 0) return gamePhase === "opening" && moveNumber <= 10 ? "book" : "best";
  if (forcedMateLost) return "blunder";

  if (gamePhase === "opening" && moveNumber <= 10 && cpLoss <= OPENING_BOOK_TOLERANCE_CP) {
    return "book";
  }

  if (cpLoss < 20) return "best";
  if (cpLoss < 50) return "good";
  if (cpLoss < 100) return "inaccuracy";
  if (cpLoss < 450) return "mistake";
  if (cpLoss < 900) return "blunder";
  return "miss";
}

function detectPhase(moveNumber) {
  if (moveNumber <= 10) return "opening";
  if (moveNumber <= 30) return "middlegame";
  return "endgame";
}

function timeControlParts(value) {
  const [base = "", increment = "0"] = String(value || "").split("+");

  return {
    baseSeconds: Number.parseInt(base, 10) || null,
    incrementSeconds: Number.parseInt(increment, 10) || 0,
  };
}

function buildTimeTroubleFlag(header, clockSeconds) {
  const { baseSeconds } = timeControlParts(header.TimeControl);

  if (!baseSeconds || !clockSeconds) return false;

  return clockSeconds <= Math.max(30, Math.floor(baseSeconds * 0.05));
}

function getVerboseHistory(chess) {
  return chess.history({ verbose: true });
}

function moveToUci(move) {
  return `${move.from}${move.to}${move.promotion || ""}`;
}

export async function analyzeGame(gameId) {
  const { rows } = await pool.query("select * from games where id = $1", [gameId]);
  const game = rows[0];

  if (!game) {
    throw new Error(`Game ${gameId} not found`);
  }

  await markGameAnalysis(gameId, {
    status: "running",
    startedAt: new Date(),
    error: null,
  });

  const chess = new Chess();
  chess.loadPgn(game.pgn);
  const header = chess.header();
  const replay = new Chess();
  const verboseMoves = getVerboseHistory(chess);
  const annotations = [];
  const engine = await createStockfishSession();
  const { baseSeconds, incrementSeconds } = timeControlParts(header.TimeControl);
  const previousClockByColor = {
    w: baseSeconds,
    b: baseSeconds,
  };
  let openingBookLookupDisabled = false;

  try {
    for (let index = 0; index < verboseMoves.length; index += 1) {
      const move = verboseMoves[index];
      const fenBefore = replay.fen();
      const turn = replay.turn();
      let moveResult;

      try {
        moveResult = replay.move({
          from: move.from,
          to: move.to,
          promotion: move.promotion,
        });
      } catch (error) {
        logInfo("analysis-move-skipped", {
          gameId,
          ply: index + 1,
          san: move.san,
          reason: error.message,
        });
        continue;
      }

      const fenAfter = replay.fen();
      const playedUci = moveToUci(move);
      const moveNumber = Math.floor(index / 2) + 1;
      const gamePhase = detectPhase(moveNumber);
      let openingBook = null;

      if (!openingBookLookupDisabled && moveNumber <= OPENING_BOOK_MAX_MOVE) {
        try {
          openingBook = await getLichessBookClassification({ fen: fenBefore, playedUci });
        } catch (error) {
          openingBookLookupDisabled = true;
          logInfo("opening-book-lookup-disabled", {
            gameId,
            reason: error.message,
            status: error.status ?? null,
          });
        }
      }

      const best = await engine.evaluate(fenBefore);
      const played = await engine.evaluate(fenAfter);
      const rawEvaluationBefore = clampEval(best.evaluation);
      const rawEvaluationAfter = clampEval(played.evaluation);
      const evaluationBefore = stockfishEvalToWhitePov(rawEvaluationBefore, turn);
      const evaluationAfter = stockfishEvalToWhitePov(rawEvaluationAfter, replay.turn());
      const cpLoss = calculateCpLoss({ best, played, playedUci });
      const playerEvaluationAfter = -played.evaluation;
      const forcedMateLost =
        best.evaluation > LOST_POSITION_CP && playerEvaluationAfter <= -MATE_SCORE_CP && cpLoss > 0;
      const classification = openingBook?.classification || classifyMove({
        cpLoss,
        forcedMateLost,
        gamePhase,
        moveNumber,
      });
      const clockSeconds = parseClockComment(move.comment);
      const previousClock = previousClockByColor[turn];
      const moveTimeSeconds = Number.isFinite(clockSeconds) && Number.isFinite(previousClock)
        ? Math.max(0, previousClock + incrementSeconds - clockSeconds)
        : null;

      if (Number.isFinite(clockSeconds)) {
        previousClockByColor[turn] = clockSeconds;
      }

      const timeTrouble = buildTimeTroubleFlag(header, clockSeconds);

      annotations.push({
        moveIndex: Math.floor(index / 2) + 1,
        ply: index + 1,
        san: move.san,
        fromSquare: move.from,
        toSquare: move.to,
        fenBefore,
        fenAfter,
        classification,
        evaluationBefore,
        evaluationAfter,
        evaluationLoss: cpLoss,
        cpLoss,
        gamePhase,
        clockSeconds,
        moveTimeSeconds,
        timeTrouble,
      });
    }
  } finally {
    engine.close();
  }

  await replaceAnnotationsForGame(gameId, annotations);
  await markGameAnalysis(gameId, {
    status: "completed",
    completedAt: new Date(),
    error: null,
  });

  return annotations;
}
