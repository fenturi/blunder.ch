import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import bB from "./assets/bB.webp";
import bK from "./assets/bK.webp";
import bN from "./assets/bN.webp";
import bP from "./assets/bP.webp";
import bQ from "./assets/bQ.webp";
import bR from "./assets/bR.webp";
import wB from "./assets/wB.webp";
import wK from "./assets/wK.webp";
import wN from "./assets/wN.webp";
import wP from "./assets/wP.webp";
import wQ from "./assets/wQ.webp";
import wR from "./assets/wR.webp";
import moveIcon1 from "./assets/1.png";
import moveIcon3 from "./assets/3.png";
import moveIcon4 from "./assets/4.png";
import moveIcon5 from "./assets/5.png";
import moveIcon6 from "./assets/6.png";
import moveIcon7 from "./assets/7.png";
import DevPanel from "./components/DevPanel.jsx";
import SignupWizard from "./components/SignupWizard.jsx";
import { apiUrl } from "./lib/api.js";

const UI_SCALE = 1.1;
const ACCOUNT_STORAGE_KEY = "blunder.account";
const phases = ["Opening", "Middlegame", "Endgame"];
const moveClassifications = ["book", "only", "best", "good", "inaccuracy", "mistake", "blunder", "miss"];
const philosophyQuotes = [
  "The unexamined game is not worth replaying.",
  "Patience is the quiet half of calculation.",
  "Every mistake is a move asking to be understood.",
  "Clarity begins where hurry ends.",
];

const pieceImages = {
  K: wK,
  Q: wQ,
  R: wR,
  B: wB,
  N: wN,
  P: wP,
  k: bK,
  q: bQ,
  r: bR,
  b: bB,
  n: bN,
  p: bP,
};

const classificationIcons = {
  book: moveIcon7,
  only: moveIcon6,
  best: moveIcon1,
  good: moveIcon1,
  ok: moveIcon1,
  inaccuracy: moveIcon5,
  mistake: moveIcon4,
  blunder: moveIcon3,
  miss: moveIcon3,
};

function scalePx(value) {
  if (typeof value !== "string") return value;

  return value.replace(/(-?\d*\.?\d+)px/g, (_, px) => {
    const scaled = Number.parseFloat(px) * UI_SCALE;
    return `${Number(scaled.toFixed(3))}px`;
  });
}

function brightenTextColor(value) {
  if (typeof value !== "string") return value;

  const compact = value.replace(/\s+/g, "");

  if (/^#fff(?:fff)?$/i.test(compact) || /^rgb\(255,255,255\)$/i.test(compact)) {
    return value;
  }

  const rgbaMatch = compact.match(/^rgba?\((\d+),(\d+),(\d+)(?:,([.\d]+))?\)$/i);

  if (rgbaMatch) {
    const [, red, green, blue, alpha] = rgbaMatch;

    if (Number(red) === 255 && Number(green) === 255 && Number(blue) === 255) {
      if (alpha == null) return value;

      const liftedAlpha = Math.min(0.96, Number(alpha) + 0.08);
      return `rgba(255,255,255,${Number(liftedAlpha.toFixed(3))})`;
    }
  }

  const hexMatch = compact.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);

  if (!hexMatch) return value;

  const hex = hexMatch[1].length === 3
    ? hexMatch[1].split("").map((char) => char + char).join("")
    : hexMatch[1];

  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const average = (red + green + blue) / 3;

  if (average < 96 || average >= 255) return value;

  const liftChannel = (channel) => Math.round(channel + (255 - channel) * 0.18);
  const nextHex = [liftChannel(red), liftChannel(green), liftChannel(blue)]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("");

  return `#${nextHex}`;
}

function sx(style) {
  return Object.fromEntries(
    Object.entries(style).map(([key, value]) => {
      if (typeof value === "string") {
        const scaled = scalePx(value);
        return [key, key === "color" ? brightenTextColor(scaled) : scaled];
      }

      return [key, value];
    })
  );
}

function createEmptyAccount() {
  return {
    email: "",
    username: "",
    platform: "",
    importId: "",
    importStatus: "",
    importedGames: 0,
    duplicateGames: 0,
    totalGames: 0,
    gamesAnalyzed: 0,
    analysisFailed: 0,
    analysisQueued: 0,
    analysisRunning: 0,
    isPremium: false,
    badges: [],
  };
}

function readStoredAccount() {
  if (typeof window === "undefined") return createEmptyAccount();

  try {
    const rawAccount = window.localStorage.getItem(ACCOUNT_STORAGE_KEY);
    if (!rawAccount) return createEmptyAccount();

    const parsedAccount = JSON.parse(rawAccount);

    if (!parsedAccount?.username || !parsedAccount?.platform) {
      return createEmptyAccount();
    }

    return {
      ...createEmptyAccount(),
      ...parsedAccount,
    };
  } catch {
    return createEmptyAccount();
  }
}

function storedAccountPayload(account) {
  return {
    email: account.email,
    username: account.username,
    platform: account.platform,
    importId: account.importId,
    importStatus: account.importStatus,
    importedGames: account.importedGames,
    duplicateGames: account.duplicateGames,
    totalGames: account.totalGames,
    gamesAnalyzed: account.gamesAnalyzed,
    analysisFailed: account.analysisFailed,
    analysisQueued: account.analysisQueued,
    analysisRunning: account.analysisRunning,
    isPremium: account.isPremium,
    badges: account.badges,
  };
}

function createEmptyDashboard() {
  return {
    Opening: [],
    Middlegame: [],
    Endgame: [],
  };
}

function createCollapsedSections() {
  return {
    Opening: true,
    Middlegame: true,
    Endgame: true,
  };
}

function createDashboardSummary() {
  return {
    totalGames: 0,
    analyzedGames: 0,
    queuedGames: 0,
    runningGames: 0,
    failedGames: 0,
  };
}

function summaryValue(summary, camelKey, snakeKey) {
  return summary?.[snakeKey] ?? summary?.[camelKey] ?? 0;
}

function rawCpLoss(annotation) {
  return Number(annotation?.cp_loss ?? annotation?.evaluation_loss ?? 0);
}

function formatCpLoss(annotation) {
  return (rawCpLoss(annotation) / 100).toFixed(2);
}

function readPgnTag(pgn, tag) {
  const match = pgn?.match?.(new RegExp(`\\[${tag} "([^"]+)"\\]`));
  return match ? match[1] : "";
}

function visualClassification(annotation) {
  if (annotation?.classification) return annotation.classification;

  const loss = rawCpLoss(annotation);

  if (annotation?.game_phase === "opening" && annotation?.move_index <= 10 && loss <= 35) return "book";
  if (loss < 20) return "best";
  if (loss < 50) return "good";
  if (loss < 100) return "inaccuracy";
  if (loss < 450) return "mistake";
  if (loss < 900) return "blunder";
  return "miss";
}

function prettifyOpeningName(game) {
  const explicitOpening = readPgnTag(game.pgn, "Opening");

  if (explicitOpening) return explicitOpening;

  const ecoUrl = readPgnTag(game.pgn, "ECOUrl");

  if (!ecoUrl) return readPgnTag(game.pgn, "ECO") || "Unknown";

  return ecoUrl.split("/").at(-1)?.replace(/-/g, " ") || "Unknown";
}

function parseFenBoard(fen) {
  const [placement] = fen.split(" ");
  const rows = placement.split("/");

  return rows.map((row) => {
    const expanded = [];

    for (const char of row) {
      if (/\d/.test(char)) {
        for (let index = 0; index < Number(char); index += 1) {
          expanded.push("");
        }
      } else {
        expanded.push(char);
      }
    }

    return expanded;
  });
}

function formatClassification(label) {
  return label.replace(/^\w/, (char) => char.toUpperCase());
}

function classificationSymbol(label) {
  if (["book", "only", "best", "ok"].includes(label)) return "!";
  if (label === "good") return "!";
  if (label === "inaccuracy") return "?!";
  if (label === "mistake") return "!?";
  if (["blunder", "miss"].includes(label)) return "??";
  return "";
}

function squareIndexes(square) {
  if (!square || square.length < 2) return null;

  const file = square.charCodeAt(0) - "a".charCodeAt(0);
  const rank = Number(square[1]);

  if (file < 0 || file > 7 || rank < 1 || rank > 8) return null;

  return {
    row: 8 - rank,
    column: file,
  };
}

function squareName(row, column) {
  return `${String.fromCharCode("a".charCodeAt(0) + column)}${8 - row}`;
}

function inferMoveTargetSquare(annotation) {
  if (annotation?.to_square) return annotation.to_square;
  if (!annotation?.fen_before || !annotation?.fen_after) return "";

  const before = parseFenBoard(annotation.fen_before);
  const after = parseFenBoard(annotation.fen_after);
  const movedWhite = annotation.ply % 2 === 1;
  const targetSquares = [];

  for (let row = 0; row < 8; row += 1) {
    for (let column = 0; column < 8; column += 1) {
      const beforePiece = before[row]?.[column] || "";
      const afterPiece = after[row]?.[column] || "";

      if (!afterPiece || beforePiece === afterPiece) continue;

      const afterIsWhite = afterPiece === afterPiece.toUpperCase();

      if (afterIsWhite === movedWhite) {
        targetSquares.push({
          square: squareName(row, column),
          piece: afterPiece.toLowerCase(),
        });
      }
    }
  }

  return targetSquares.find((candidate) => candidate.piece === "k")?.square
    || targetSquares[0]?.square
    || "";
}

function formatMoveLabel(annotation) {
  const prefix = annotation.ply % 2 === 1
    ? `${annotation.move_index}.`
    : `${annotation.move_index}...`;

  return `${prefix} ${annotation.san}`;
}

function formatMovePrefix(annotation) {
  return annotation?.ply % 2 === 1
    ? `${annotation.move_index}.`
    : `${annotation.move_index}...`;
}

function bestMoveSan(annotation) {
  return annotation?.best_move_san || annotation?.bestMoveSan || "";
}

function bestMoveUci(annotation) {
  return annotation?.best_move_uci || annotation?.bestMoveUci || "";
}

function formatBestMoveLabel(annotation) {
  const san = bestMoveSan(annotation);
  if (!san) return "";
  return `${formatMovePrefix(annotation)} ${san}`;
}

function variationPly(basePly, index) {
  return Number(basePly || 0) + index + 1;
}

function variationMovePrefix(basePly, index) {
  const ply = variationPly(basePly, index);
  const moveNumber = Math.ceil(ply / 2);
  return ply % 2 === 1 ? `${moveNumber}.` : `${moveNumber}...`;
}

function formatVariationMoveLabel(move, basePly, index) {
  return `${variationMovePrefix(basePly, index)} ${move.san || move.uci || ""}`;
}

function formatVariationLine(moves, basePly) {
  return moves
    .map((move, index) => formatLineMoveToken(basePly, index, move.san || move.uci || ""))
    .join(" ");
}

function formatLineMoveToken(basePly, index, moveSan) {
  const ply = variationPly(basePly, index);

  if (index === 0 || ply % 2 === 1) {
    return `${variationMovePrefix(basePly, index)} ${moveSan}`;
  }

  return moveSan;
}

function variationAnnotationFromMove(move, basePly, index) {
  const ply = variationPly(basePly, index);

  return {
    ply,
    move_index: Math.ceil(ply / 2),
    san: move.san || move.uci || "",
    fen_before: move.fenBefore,
    fen_after: move.fenAfter,
    from_square: move.from,
    to_square: move.to,
    classification: "best",
    cp_loss: 0,
    evaluation_after: move.evaluation_after ?? move.evaluationAfter ?? 0,
    game_phase: "analysis",
  };
}

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

function playerColorForGame(game, username) {
  const normalizedUsername = normalizeName(username);

  if (!normalizedUsername) return "";
  if (normalizeName(game.white_player) === normalizedUsername) return "white";
  if (normalizeName(game.black_player) === normalizedUsername) return "black";
  return "";
}

function winPercentFromCp(cp) {
  const boundedCp = Math.max(-1000, Math.min(1000, Number(cp) || 0));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * boundedCp)) - 1);
}

function moveScore(annotation) {
  const cpLoss = rawCpLoss(annotation);

  if (cpLoss <= 0) return 100;

  const isWhiteMove = annotation.ply % 2 === 1;
  const before = Number(annotation.evaluation_before ?? 0);
  const after = Number(annotation.evaluation_after ?? 0);
  const playerBefore = isWhiteMove ? before : -before;
  const playerAfter = isWhiteMove ? after : -after;
  const winPercentLoss = Math.max(0, winPercentFromCp(playerBefore) - winPercentFromCp(playerAfter));
  const accuracy = 103.1668100711649 * Math.exp(-0.04354415386753951 * winPercentLoss) - 3.166924740191411;

  return Math.max(0, Math.min(100, accuracy));
}

function annotationsForColor(game, color) {
  return (game.annotations || []).filter((annotation) => (
    color === "white" ? annotation.ply % 2 === 1 : annotation.ply % 2 === 0
  ));
}

function buildSideSummary(game, color) {
  const annotations = annotationsForColor(game, color);
  const counts = Object.fromEntries(moveClassifications.map((classification) => [classification, 0]));

  for (const annotation of annotations) {
    const classification = visualClassification(annotation);
    counts[classification] = (counts[classification] || 0) + 1;
  }

  const accuracy = annotations.length
    ? Math.round(
      annotations.reduce((total, annotation) => total + moveScore(annotation), 0)
      / annotations.length
    )
    : 0;

  return {
    accuracy,
    counts,
    moveCount: annotations.length,
  };
}

function evalBarPercent(annotation) {
  const evaluation = Number(annotation?.evaluation_after ?? 0);
  return Math.max(4, Math.min(96, 50 + evaluation / 20));
}

const BOARD_MARK_COLOR = "#f2f2f2";
const BOARD_MARK_STROKE = 3.2;
const ANALYSIS_SIDE_PANEL_HEIGHT = "min(620px, calc(100vh - 190px))";

function boardSquareCenter(square) {
  const indexes = squareIndexes(square);
  if (!indexes) return null;

  return {
    x: indexes.column * 12.5 + 6.25,
    y: indexes.row * 12.5 + 6.25,
  };
}

function pieceColor(piece) {
  if (!piece) return "";
  return piece === piece.toUpperCase() ? "white" : "black";
}

function pieceAt(board, square) {
  const indexes = squareIndexes(square);
  return indexes ? board[indexes.row]?.[indexes.column] || "" : "";
}

function boardChangeCount(previousBoard, nextBoard) {
  let changes = 0;

  for (let row = 0; row < 8; row += 1) {
    for (let column = 0; column < 8; column += 1) {
      if ((previousBoard[row]?.[column] || "") !== (nextBoard[row]?.[column] || "")) changes += 1;
    }
  }

  return changes;
}

function capturedPiecesForTransition(previousBoard, nextBoard, moves) {
  const movingFromSquares = new Set(moves.map((move) => squareName(move.from.row, move.from.column)));
  const movingToSquares = new Set(moves.map((move) => squareName(move.to.row, move.to.column)));
  const captures = [];

  for (let row = 0; row < 8; row += 1) {
    for (let column = 0; column < 8; column += 1) {
      const before = previousBoard[row]?.[column] || "";
      const after = nextBoard[row]?.[column] || "";
      const square = squareName(row, column);

      if (!before || before === after || movingFromSquares.has(square)) continue;
      if (movingToSquares.has(square) || !after) {
        captures.push({ piece: before, square: { row, column } });
      }
    }
  }

  return captures;
}

function transitionFromMoveSquares(previousBoard, nextBoard, fromSquare, toSquare) {
  const from = squareIndexes(fromSquare);
  const to = squareIndexes(toSquare);
  if (!from || !to) return null;

  const movingPiece = pieceAt(previousBoard, fromSquare);
  const finalPiece = pieceAt(nextBoard, toSquare);
  if (!movingPiece || !finalPiece || pieceColor(movingPiece) !== pieceColor(finalPiece)) return null;

  const moves = [{ piece: movingPiece, from, to }];

  if (movingPiece.toLowerCase() === "k" && Math.abs(to.column - from.column) === 2) {
    const rookFrom = { row: from.row, column: to.column > from.column ? 7 : 0 };
    const rookTo = { row: from.row, column: to.column > from.column ? 5 : 3 };
    const rookPiece = previousBoard[rookFrom.row]?.[rookFrom.column] || "";

    if (rookPiece.toLowerCase() === "r") {
      moves.push({ piece: rookPiece, from: rookFrom, to: rookTo });
    }
  }

  return {
    moves,
    captures: capturedPiecesForTransition(previousBoard, nextBoard, moves),
  };
}

function transitionFromBoardDiff(previousBoard, nextBoard) {
  const removed = [];
  const added = [];

  for (let row = 0; row < 8; row += 1) {
    for (let column = 0; column < 8; column += 1) {
      const before = previousBoard[row]?.[column] || "";
      const after = nextBoard[row]?.[column] || "";

      if (before === after) continue;
      if (before) removed.push({ piece: before, square: { row, column } });
      if (after) added.push({ piece: after, square: { row, column } });
    }
  }

  if (!removed.length || !added.length || removed.length > 3 || added.length > 3) {
    return { moves: [], captures: [] };
  }

  const moves = [];
  const usedRemoved = new Set();
  const usedAdded = new Set();
  const passes = [
    (removedPiece, addedPiece) => removedPiece === addedPiece,
    (removedPiece, addedPiece) => pieceColor(removedPiece) === pieceColor(addedPiece),
  ];

  for (const pass of passes) {
    removed.forEach((removedItem, removedIndex) => {
      if (usedRemoved.has(removedIndex)) return;

      const addedIndex = added.findIndex((addedItem, candidateIndex) => (
        !usedAdded.has(candidateIndex) && pass(removedItem.piece, addedItem.piece)
      ));

      if (addedIndex < 0) return;

      usedRemoved.add(removedIndex);
      usedAdded.add(addedIndex);
      moves.push({
        piece: removedItem.piece,
        from: removedItem.square,
        to: added[addedIndex].square,
      });
    });
  }

  return {
    moves,
    captures: removed
      .filter((_, index) => !usedRemoved.has(index))
      .map((item) => ({ piece: item.piece, square: item.square })),
  };
}

function inferPieceTransition(previousBoard, nextBoard, annotation) {
  if (boardChangeCount(previousBoard, nextBoard) > 6) {
    return { moves: [], captures: [] };
  }

  const fromSquare = annotation?.from_square || annotation?.fromSquare || "";
  const toSquare = annotation?.to_square || annotation?.toSquare || "";
  const directTransition = transitionFromMoveSquares(previousBoard, nextBoard, fromSquare, toSquare);

  return directTransition || transitionFromBoardDiff(previousBoard, nextBoard);
}

function createBoardPieces(board, seed = "piece") {
  const counts = {};
  const pieces = [];

  for (let row = 0; row < 8; row += 1) {
    for (let column = 0; column < 8; column += 1) {
      const piece = board[row]?.[column] || "";
      if (!piece) continue;

      counts[piece] = (counts[piece] || 0) + 1;
      pieces.push({
        id: `${seed}-${piece}-${counts[piece]}`,
        piece,
        row,
        column,
        exiting: false,
      });
    }
  }

  return pieces;
}

function piecePositionKey(row, column) {
  return `${row}-${column}`;
}

function reconcileBoardPieces(currentPieces, previousBoard, nextBoard, annotation) {
  const transition = inferPieceTransition(previousBoard, nextBoard, annotation);
  const activePieces = currentPieces.filter((piece) => !piece.exiting);
  const activeBySquare = new Map(
    activePieces.map((piece) => [piecePositionKey(piece.row, piece.column), piece])
  );
  const consumedPieceIds = new Set();
  const assignedSquares = new Set();
  const nextPieces = [];

  transition.moves.forEach((move) => {
    const fromKey = piecePositionKey(move.from.row, move.from.column);
    const toKey = piecePositionKey(move.to.row, move.to.column);
    const currentPiece = activeBySquare.get(fromKey);
    const finalPiece = nextBoard[move.to.row]?.[move.to.column] || move.piece;

    if (currentPiece) {
      consumedPieceIds.add(currentPiece.id);
      assignedSquares.add(toKey);
      nextPieces.push({
        ...currentPiece,
        piece: finalPiece,
        row: move.to.row,
        column: move.to.column,
        exiting: false,
      });
    }
  });

  for (let row = 0; row < 8; row += 1) {
    for (let column = 0; column < 8; column += 1) {
      const piece = nextBoard[row]?.[column] || "";
      const squareKey = piecePositionKey(row, column);

      if (!piece || assignedSquares.has(squareKey)) continue;

      const sameSquarePiece = activeBySquare.get(squareKey);
      if (sameSquarePiece && !consumedPieceIds.has(sameSquarePiece.id) && sameSquarePiece.piece === piece) {
        consumedPieceIds.add(sameSquarePiece.id);
        assignedSquares.add(squareKey);
        nextPieces.push({
          ...sameSquarePiece,
          piece,
          row,
          column,
          exiting: false,
        });
      } else {
        const createdPiece = createBoardPieces([[piece]], `piece-${Date.now()}-${row}-${column}`)[0];
        nextPieces.push({
          ...createdPiece,
          row,
          column,
        });
      }
    }
  }

  activePieces.forEach((piece) => {
    if (consumedPieceIds.has(piece.id)) return;

    nextPieces.push({
      ...piece,
      exiting: true,
    });
  });

  return nextPieces;
}

function summaryUserColor(game, account) {
  return playerColorForGame(game, account?.username) || "white";
}

function boardFocusFromAnnotation(annotation, preferBestMove = false) {
  return {
    key: `${annotation?.ply || "move"}-${preferBestMove ? "best" : "played"}`,
    fen: preferBestMove ? annotation?.fen_before || annotation?.fen_after : annotation?.fen_after || annotation?.fen_before,
    annotation,
    arrows: [],
    circles: [],
  };
}

const phaseTroubleWeights = {
  inaccuracy: 1,
  mistake: 3,
  blunder: 5,
  miss: 6,
};

const phaseAdvice = {
  opening: "The opening job is simple: get pieces out, castle, and avoid early pawn grabs unless your development can support them.",
  middlegame: "The middlegame job is to make threats only after your worst piece improves and your king is not becoming the target.",
  endgame: "The endgame job is king activity, pawn races, and clean conversion; one loose tempo matters much more here.",
};

function normalizePhase(value) {
  const phase = String(value || "").toLowerCase();
  if (phase.includes("opening")) return "opening";
  if (phase.includes("end")) return "endgame";
  return "middlegame";
}

function phaseTitle(value) {
  return value.replace(/^\w/, (char) => char.toUpperCase());
}

function troubleWeight(annotation) {
  return phaseTroubleWeights[visualClassification(annotation)] || 0;
}

function emptyPhaseStat(phase) {
  return {
    phase,
    count: 0,
    totalLoss: 0,
    score: 0,
    worst: null,
  };
}

function buildPhaseTroubleNotes(game, account) {
  const userColor = summaryUserColor(game, account);
  const stats = {
    opening: emptyPhaseStat("opening"),
    middlegame: emptyPhaseStat("middlegame"),
    endgame: emptyPhaseStat("endgame"),
  };

  for (const annotation of annotationsForColor(game, userColor)) {
    const weight = troubleWeight(annotation);
    if (!weight) continue;

    const phase = normalizePhase(annotation.game_phase);
    const loss = rawCpLoss(annotation);
    const stat = stats[phase];

    stat.count += 1;
    stat.totalLoss += loss;
    stat.score += weight * 100 + Math.min(900, loss);

    if (!stat.worst || loss > rawCpLoss(stat.worst)) {
      stat.worst = annotation;
    }
  }

  const troubledPhases = Object.values(stats)
    .filter((stat) => stat.count > 0)
    .sort((left, right) => right.score - left.score);

  if (!troubledPhases.length) {
    return [{
      label: "No clear phase trouble",
      section: "phase trouble",
      annotation: null,
      boardFocus: null,
      classification: "",
      metric: "clean",
      text: "No phase had a mistake, blunder, or miss from your side. The useful takeaway is maintenance: keep the same structure-aware decisions into the next game.",
    }];
  }

  return troubledPhases.map((stat) => {
    const worst = stat.worst;
    const classification = visualClassification(worst);
    const classificationLabel = formatClassification(classification);
    const label = `${phaseTitle(stat.phase)} ${classificationLabel.toLowerCase()}`;
    const moveLabel = formatMoveLabel(worst);
    const bestLabel = formatBestMoveLabel(worst);
    const bestMoveText = bestLabel
      ? `Stockfish preferred ${bestLabel}, so this is not just a bad category label; it points to a concrete replacement move.`
      : "Re-analyse this game to show the exact Stockfish replacement move for this position.";

    return {
      label,
      section: "move contrast",
      annotation: worst,
      boardFocus: boardFocusFromAnnotation(worst),
      classification,
      metric: `${classificationLabel} | -${formatCpLoss(worst)} pawns`,
      contrast: {
        played: moveLabel,
        best: bestLabel,
        bestUci: bestMoveUci(worst),
        loss: formatCpLoss(worst),
      },
      text: `${phaseTitle(stat.phase)} was the phase that actually cost you. You played ${moveLabel}, a ${classificationLabel.toLowerCase()} worth ${formatCpLoss(worst)} pawns. ${bestMoveText} ${phaseAdvice[stat.phase]}`,
    };
  });
}

function fenAfterOpening(game) {
  const annotations = game.annotations || [];
  const openingEnd = annotations.find((annotation) => annotation.move_index >= 10) || annotations.at(-1);
  return openingEnd?.fen_after || openingEnd?.fen_before || "";
}

function filePawnCounts(board) {
  return Array.from({ length: 8 }, (_, fileIndex) => (
    board.reduce((count, row) => count + (row[fileIndex]?.toLowerCase() === "p" ? 1 : 0), 0)
  ));
}

function materialFeaturesFromFen(fen) {
  if (!fen) {
    return {
      pawns: 16,
      openFiles: 0,
      halfOpenFiles: 0,
      bishopPairSides: 0,
    };
  }

  const board = parseFenBoard(fen);
  const pieces = board.flat();
  const pawnFiles = filePawnCounts(board);
  const whiteBishops = pieces.filter((piece) => piece === "B").length;
  const blackBishops = pieces.filter((piece) => piece === "b").length;

  return {
    pawns: pieces.filter((piece) => piece.toLowerCase() === "p").length,
    openFiles: pawnFiles.filter((count) => count === 0).length,
    halfOpenFiles: pawnFiles.filter((count) => count === 1).length,
    bishopPairSides: [whiteBishops, blackBishops].filter((count) => count >= 2).length,
  };
}

function openingStructure(features) {
  if (features.pawns <= 12 || features.openFiles >= 2 || (features.openFiles >= 1 && features.bishopPairSides >= 1)) {
    return {
      label: "open",
      idea: "This game is supposed to feel open: development, king safety, active bishops, and rooks on open files matter more than slow pawn moves.",
    };
  }

  if (features.pawns <= 14 || features.openFiles >= 1 || features.halfOpenFiles >= 3 || features.bishopPairSides >= 1) {
    return {
      label: "semi-open",
      idea: "This game is only partly open: use the half-open files and bishop activity, but make a pawn break before pretending every piece has full freedom.",
    };
  }

  return {
    label: "closed",
    idea: "This game is supposed to feel closed: improve knights, prepare pawn breaks, and avoid trading away the piece that guards your break square.",
  };
}

function buildOpeningIdeaNote(game) {
  const features = materialFeaturesFromFen(fenAfterOpening(game));
  const structure = openingStructure(features);
  const openingName = prettifyOpeningName(game);

  return {
    label: `${structure.label} opening`,
    section: "opening idea",
    annotation: null,
    boardFocus: null,
    classification: "",
    metric: `${features.pawns} pawns | ${features.openFiles} open files | ${features.bishopPairSides} bishop pair${features.bishopPairSides === 1 ? "" : "s"}`,
    text: `${openingName}: ${structure.idea}`,
  };
}

function createGameSummary(game, account) {
  return {
    insights: [
      buildOpeningIdeaNote(game),
      ...buildPhaseTroubleNotes(game, account),
    ],
  };
}

function createSummarySlides(summary) {
  return summary.insights.map((note) => ({
    section: note.section,
    title: note.label,
    kind: note.section,
    item: note,
    boardFocus: note.boardFocus,
    frames: [],
  }));
}

function Board({
  fen,
  annotation,
  isExploringLine = false,
  maxWidth = "560px",
  minWidth = "260px",
  interactive = true,
  onMove = null,
  isMoveBusy = false,
  autoArrows = [],
  autoCircles = [],
}) {
  const boardRef = useRef(null);
  const [circleMarks, setCircleMarks] = useState([]);
  const [arrowMarks, setArrowMarks] = useState([]);
  const [markStart, setMarkStart] = useState(null);
  const [draftArrow, setDraftArrow] = useState(null);
  const [dragMove, setDragMove] = useState(null);
  const board = useMemo(() => parseFenBoard(fen), [fen]);
  const previousPositionRef = useRef({ fen, board });
  const [animatedPieces, setAnimatedPieces] = useState(() => createBoardPieces(board, "initial"));
  const animatedPiecesRef = useRef(animatedPieces);
  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"];
  const displayClassification = visualClassification(annotation);
  const badgeSquare = squareIndexes(inferMoveTargetSquare(annotation));
  const badgeIcon = classificationIcons[displayClassification];
  const badgeSymbol = classificationSymbol(displayClassification);
  const badgeTitle = formatClassification(displayClassification);

  useLayoutEffect(() => {
    const previousPosition = previousPositionRef.current;
    const nextBoard = board;

    if (previousPosition.fen === fen) {
      previousPositionRef.current = { fen, board: nextBoard };
      return undefined;
    }

    const nextPieces = reconcileBoardPieces(
      animatedPiecesRef.current,
      previousPosition.board,
      nextBoard,
      annotation
    );
    previousPositionRef.current = { fen, board: nextBoard };
    animatedPiecesRef.current = nextPieces;
    setAnimatedPieces(nextPieces);

    const timeoutId = window.setTimeout(() => {
      const settledPieces = animatedPiecesRef.current.filter((piece) => !piece.exiting);
      animatedPiecesRef.current = settledPieces;
      setAnimatedPieces(settledPieces);
    }, 260);

    return () => window.clearTimeout(timeoutId);
  }, [fen, annotation, board]);

  function squareFromPointer(event) {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return "";

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return "";

    const column = Math.min(7, Math.max(0, Math.floor((x / rect.width) * 8)));
    const row = Math.min(7, Math.max(0, Math.floor((y / rect.height) * 8)));
    return squareName(row, column);
  }

  function pointerPercent(event) {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };

    return {
      x: Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100)),
    };
  }

  function toggleCircleMark(square) {
    setCircleMarks((current) => (
      current.includes(square)
        ? current.filter((mark) => mark !== square)
        : [...current, square]
    ));
  }

  function toggleArrowMark(from, to) {
    setArrowMarks((current) => {
      const exists = current.some((mark) => mark.from === from && mark.to === to);
      return exists
        ? current.filter((mark) => mark.from !== from || mark.to !== to)
        : [...current, { from, to }];
    });
  }

  function handleBoardPointerDown(event) {
    if (!interactive) return;

    if (event.button === 0) {
      const square = squareFromPointer(event);
      const piece = pieceAt(board, square);

      if (onMove && !isMoveBusy && piece) {
        event.preventDefault();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        setArrowMarks([]);
        setCircleMarks([]);
        setMarkStart(null);
        setDraftArrow(null);
        setDragMove({
          from: square,
          to: square,
          piece,
          pointer: pointerPercent(event),
        });
        return;
      }

      setArrowMarks([]);
      setCircleMarks([]);
      setMarkStart(null);
      setDraftArrow(null);
      return;
    }

    if (event.button !== 2) return;

    const square = squareFromPointer(event);
    if (!square) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setMarkStart(square);
    setDraftArrow(null);
  }

  function handleBoardPointerMove(event) {
    if (!interactive) return;

    if (dragMove) {
      const square = squareFromPointer(event);
      setDragMove((current) => (
        current
          ? { ...current, to: square || current.to, pointer: pointerPercent(event) }
          : current
      ));
      return;
    }

    if (!markStart) return;

    const square = squareFromPointer(event);
    setDraftArrow(square && square !== markStart ? { from: markStart, to: square } : null);
  }

  function handleBoardPointerUp(event) {
    if (!interactive) return;

    if (dragMove) {
      const targetSquare = squareFromPointer(event);
      event.preventDefault();
      event.currentTarget.releasePointerCapture?.(event.pointerId);

      if (targetSquare && targetSquare !== dragMove.from) {
        onMove?.({ from: dragMove.from, to: targetSquare });
      }

      setDragMove(null);
      return;
    }

    if (!markStart) return;

    const square = squareFromPointer(event);
    event.preventDefault();
    event.currentTarget.releasePointerCapture?.(event.pointerId);

    if (square && square !== markStart) {
      toggleArrowMark(markStart, square);
    } else if (square === markStart) {
      toggleCircleMark(square);
    }

    setMarkStart(null);
    setDraftArrow(null);
  }

  function handleBoardPointerCancel(event) {
    if (dragMove) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      setDragMove(null);
    }
    setMarkStart(null);
    setDraftArrow(null);
  }

  function handleBoardContextMenu(event) {
    if (interactive) event.preventDefault();
  }

  const visibleCircles = [...autoCircles, ...circleMarks];
  const visibleArrows = [
    ...autoArrows,
    ...arrowMarks,
    ...(draftArrow ? [draftArrow] : []),
  ];

  return (
    <div
      ref={boardRef}
      onContextMenu={handleBoardContextMenu}
      onPointerDown={handleBoardPointerDown}
      onPointerMove={handleBoardPointerMove}
      onPointerUp={handleBoardPointerUp}
      onPointerCancel={handleBoardPointerCancel}
      style={sx({
        position: "relative",
        width: "100%",
        maxWidth,
        minWidth,
        aspectRatio: "1 / 1",
        display: "grid",
        gridTemplateColumns: "repeat(8, 1fr)",
        gridTemplateRows: "repeat(8, minmax(0, 1fr))",
        border: "1px solid rgba(255,255,255,0.08)",
        background: "#0c0e11",
        overflow: "hidden",
        cursor: onMove && !isMoveBusy ? "grab" : "default",
        touchAction: onMove ? "none" : "auto",
        filter: isExploringLine ? "brightness(1.16) saturate(1.08)" : "none",
        boxShadow: isExploringLine ? "0 0 0 1px rgba(255,255,255,0.18), 0 0 28px rgba(255,255,255,0.08)" : "none",
        transition: "filter 160ms ease, box-shadow 160ms ease",
      })}
    >
      {board.flatMap((row, rowIndex) =>
        row.map((_, columnIndex) => {
          const isLight = (rowIndex + columnIndex) % 2 === 0;

          return (
            <div
              key={`${rowIndex}-${columnIndex}`}
              style={sx({
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: isLight ? "#d4d0c7" : "#3a4046",
                minWidth: 0,
                minHeight: 0,
                aspectRatio: "1 / 1",
                userSelect: "none",
              })}
            >
              {columnIndex === 0 ? (
                <span
                  style={sx({
                    position: "absolute",
                    top: "8px",
                    left: "8px",
                    fontSize: "11px",
                    color: isLight ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.45)",
                    letterSpacing: ".08em",
                  })}
                >
                  {ranks[rowIndex]}
                </span>
              ) : null}

              {rowIndex === 7 ? (
                <span
                  style={sx({
                    position: "absolute",
                    right: "8px",
                    bottom: "8px",
                    fontSize: "11px",
                    color: isLight ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.45)",
                    letterSpacing: ".08em",
                  })}
                >
                  {files[columnIndex]}
                </span>
              ) : null}
            </div>
          );
        })
      )}
      {animatedPieces.map((piece) => {
        const pieceImage = pieceImages[piece.piece];
        if (!pieceImage) return null;
        const isDragSource = dragMove
          && squareName(piece.row, piece.column) === dragMove.from
          && piece.piece === dragMove.piece
          && !piece.exiting;

        return (
          <div
            key={piece.id}
            className={`chess-board-piece${piece.exiting ? " is-exiting" : ""}${isDragSource ? " is-drag-source" : ""}`}
            style={sx({
              "--piece-column": String(piece.column),
              "--piece-row": String(piece.row),
            })}
          >
            <img src={pieceImage} alt={piece.piece} draggable="false" />
          </div>
        );
      })}
      {dragMove ? (
        <div
          className="chess-board-drag-ghost"
          style={sx({
            left: `${dragMove.pointer.x}%`,
            top: `${dragMove.pointer.y}%`,
          })}
        >
          <img src={pieceImages[dragMove.piece]} alt="" draggable="false" />
        </div>
      ) : null}
      {!isExploringLine && badgeSquare ? (
        <div
          style={sx({
            position: "absolute",
            left: `${badgeSquare.column * 12.5}%`,
            top: `${badgeSquare.row * 12.5}%`,
            width: "12.5%",
            height: "12.5%",
            pointerEvents: "none",
            zIndex: 6,
          })}
        >
          {badgeIcon ? (
            <img
              src={badgeIcon}
              alt={badgeTitle}
              title={badgeTitle}
              draggable="false"
              style={sx({
                position: "absolute",
                width: "32%",
                height: "32%",
                right: "6%",
                top: "6%",
                objectFit: "contain",
                filter: "drop-shadow(0 2px 5px rgba(0,0,0,0.45))",
              })}
            />
          ) : badgeSymbol ? (
            <span
              title={badgeTitle}
              style={sx({
                position: "absolute",
                right: "7%",
                top: "6%",
                minWidth: "22px",
                height: "22px",
                borderRadius: "50%",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(15,16,18,0.82)",
                color: "#fff",
                fontSize: "16px",
                fontWeight: 500,
                lineHeight: 1,
              })}
            >
              {badgeSymbol}
            </span>
          ) : null}
        </div>
      ) : null}
      <svg
        viewBox="0 0 100 100"
        aria-hidden="true"
        style={sx({
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 4,
          overflow: "visible",
        })}
      >
        {visibleCircles.map((square, index) => {
          const center = boardSquareCenter(square);
          if (!center) return null;

          return (
            <circle
              key={`${square}-${index}`}
              cx={center.x}
              cy={center.y}
              r="4.45"
              fill="none"
              stroke={BOARD_MARK_COLOR}
              strokeWidth="1.8"
              opacity="0.86"
            />
          );
        })}

        {visibleArrows.map((arrow, index) => {
          const from = boardSquareCenter(arrow.from);
          const to = boardSquareCenter(arrow.to);
          if (!from || !to) return null;

          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const length = Math.hypot(dx, dy) || 1;
          const unitX = dx / length;
          const unitY = dy / length;
          const headLength = 4.4;
          const headWidth = 4.2;
          const tipInset = 2.7;
          const tip = {
            x: to.x - unitX * tipInset,
            y: to.y - unitY * tipInset,
          };
          const base = {
            x: tip.x - unitX * headLength,
            y: tip.y - unitY * headLength,
          };
          const wingX = -unitY * (headWidth / 2);
          const wingY = unitX * (headWidth / 2);
          const headPoints = [
            `${tip.x},${tip.y}`,
            `${base.x + wingX},${base.y + wingY}`,
            `${base.x - wingX},${base.y - wingY}`,
          ].join(" ");
          const opacity = arrow === draftArrow ? "0.62" : "0.72";

          return (
            <g key={`${arrow.from}-${arrow.to}-${index}`} opacity={opacity}>
              <line
                x1={from.x}
                y1={from.y}
                x2={base.x}
                y2={base.y}
                stroke={BOARD_MARK_COLOR}
                strokeWidth={BOARD_MARK_STROKE}
                strokeLinecap="round"
              />
              <polygon points={headPoints} fill={BOARD_MARK_COLOR} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function groupAnnotationsByMove(annotations) {
  const moves = [];

  for (const annotation of annotations || []) {
    const index = annotation.move_index - 1;

    if (!moves[index]) {
      moves[index] = {
        moveIndex: annotation.move_index,
        white: null,
        black: null,
      };
    }

    if (annotation.ply % 2 === 1) {
      moves[index].white = annotation;
    } else {
      moves[index].black = annotation;
    }
  }

  return moves.filter(Boolean);
}

function MoveListCell({ annotation, activePly, onSelectPly }) {
  if (!annotation) {
    return <span style={sx({ minHeight: "34px" })} />;
  }

  const isActive = annotation.ply === activePly;
  const displayClassification = visualClassification(annotation);
  const classificationTitle = formatClassification(displayClassification);
  const accent = displayClassification === "blunder"
    ? "#f0d8d8"
    : displayClassification === "mistake"
      ? "#e4dfcf"
      : displayClassification === "inaccuracy"
        ? "rgba(255,255,255,0.52)"
        : "rgba(255,255,255,0.38)";

  return (
    <button
      type="button"
      onClick={() => onSelectPly(annotation.ply)}
      title={`${annotation.san}: ${classificationTitle}`}
        style={sx({
          minHeight: "30px",
          background: isActive ? "rgba(255,255,255,0.07)" : "transparent",
        border: "none",
        color: accent,
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        justifyContent: "center",
          gap: "3px",
          padding: "5px 8px",
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "inherit",
      })}
    >
      <span style={sx({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" })}>
        <span style={sx({ fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" })}>
          {annotation.san}
        </span>
      </span>
    </button>
  );
}

function AccuracyCard({ color, player, summary, isUser }) {
  return (
    <div
      style={sx({
        display: "grid",
        gap: "10px",
        padding: "12px 0",
        borderTop: "1px solid rgba(255,255,255,0.065)",
      })}
    >
      <div style={sx({ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px" })}>
        <div style={sx({ minWidth: 0 })}>
          <div style={sx({ fontSize: "10px", letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,0.24)", marginBottom: "5px" })}>
            {color}{isUser ? " / you" : ""}
          </div>
          <div style={sx({ fontSize: "14px", color: "rgba(255,255,255,0.58)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" })}>
            {player}
          </div>
        </div>
        <div style={sx({ fontSize: "32px", color: "#fff", lineHeight: 1 })}>
          {summary.accuracy}
          <span style={sx({ fontSize: "14px", color: "rgba(255,255,255,0.32)", marginLeft: "2px" })}>%</span>
        </div>
      </div>

      <div
        style={sx({
          display: "grid",
          gridTemplateColumns: "repeat(8, minmax(0, 1fr))",
          gap: "5px",
        })}
      >
        {moveClassifications.map((classification) => (
          <div
            key={classification}
            style={sx({
              background: "rgba(255,255,255,0.035)",
              padding: "6px 4px",
              minWidth: 0,
            })}
          >
            <div style={sx({ fontSize: "15px", color: "rgba(255,255,255,0.72)", lineHeight: 1.1 })}>
              {summary.counts[classification] || 0}
            </div>
            <div style={sx({ fontSize: "8px", letterSpacing: ".06em", textTransform: "uppercase", color: "rgba(255,255,255,0.22)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" })}>
              {classification.slice(0, 4)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GameSummaryBlock({ title, children }) {
  return (
    <section
      className="game-summary-stage game-summary-reveal"
      style={sx({
        display: "grid",
        gridTemplateRows: "auto 1fr",
        gap: "18px",
        minHeight: "410px",
        padding: "20px 0 24px",
        borderTop: "1px solid rgba(255,255,255,0.065)",
      })}
    >
      <div style={sx({ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "14px" })}>
        <div style={sx({ fontSize: "10px", letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)" })}>
          {title}
        </div>
        <span className="game-summary-live-dot" aria-hidden="true" />
      </div>
      <div className="game-summary-slide-body" style={sx({ alignSelf: "center" })}>
        {children}
      </div>
    </section>
  );
}

function GameSummaryPanel({ game, account, onSelectPly, onBoardFocus }) {
  const [summary, setSummary] = useState(null);
  const [slides, setSlides] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lineFrameIndex, setLineFrameIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!slides.length) return undefined;

    const activeSlide = slides[activeIndex];
    const frames = activeSlide?.frames || [];
    const activeFrame = frames[lineFrameIndex];
    const focus = activeFrame?.boardFocus || activeSlide?.boardFocus || null;

    const focusTimer = window.setTimeout(() => {
      onBoardFocus(focus);
    }, 80);
    let nextTimer = null;

    if (frames.length && lineFrameIndex < frames.length - 1) {
      nextTimer = window.setTimeout(() => {
        setLineFrameIndex((current) => Math.min(frames.length - 1, current + 1));
      }, 1450);
    } else if (activeIndex < slides.length - 1) {
      nextTimer = window.setTimeout(() => {
        setLineFrameIndex(0);
        setActiveIndex((current) => Math.min(slides.length - 1, current + 1));
      }, frames.length ? 3400 : 6200);
    }

    return () => {
      window.clearTimeout(focusTimer);
      if (nextTimer) window.clearTimeout(nextTimer);
    };
  }, [activeIndex, lineFrameIndex, slides, onBoardFocus]);

  function handleGenerateSummary() {
    setSummary(null);
    setSlides([]);
    setActiveIndex(0);
    setLineFrameIndex(0);
    onBoardFocus(null);
    setIsGenerating(true);

    window.setTimeout(() => {
      const nextSummary = createGameSummary(game, account);
      const nextSlides = createSummarySlides(nextSummary);

      setSummary(nextSummary);
      setSlides(nextSlides);
      setActiveIndex(0);
      setLineFrameIndex(0);
      setIsGenerating(false);
    }, 520);
  }

  function goToSlide(index) {
    const nextIndex = Math.max(0, Math.min(slides.length - 1, index));
    setActiveIndex(nextIndex);
    setLineFrameIndex(0);
  }

  if (!summary) {
    return (
      <div style={sx({ display: "grid", gap: "14px", paddingTop: "2px" })}>
        <div>
          <div style={sx({ fontSize: "10px", letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,0.22)", marginBottom: "8px" })}>
            phase insight
          </div>
          <div style={sx({ fontSize: "20px", color: "#fff", lineHeight: 1.15 })}>
            Generate game summary
          </div>
        </div>

        <button
          type="button"
          disabled={isGenerating}
          onClick={handleGenerateSummary}
          style={sx({
            border: "1px solid rgba(255,255,255,0.18)",
            background: isGenerating ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.08)",
            color: "#fff",
            minHeight: "42px",
            padding: "10px 13px",
            textAlign: "left",
            fontSize: "13px",
            letterSpacing: ".08em",
            textTransform: "uppercase",
            cursor: isGenerating ? "default" : "pointer",
            fontFamily: "inherit",
          })}
        >
          {isGenerating ? "generating" : "generate phase summary"}
        </button>

        {isGenerating ? (
          <div className="game-summary-loading" style={sx({ height: "2px", background: "rgba(255,255,255,0.06)", overflow: "hidden" })} />
        ) : null}
      </div>
    );
  }

  const activeSlide = slides[activeIndex];

  function renderSlide(slide) {
    const note = slide.item;
    const noteBody = (
      <div style={sx({ display: "grid", gap: "14px", minHeight: "300px", alignContent: "center" })}>
        <div style={sx({ display: "grid", gap: "6px" })}>
          <div style={sx({ fontSize: "11px", letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,0.48)" })}>
            {slide.section}
          </div>
          <div style={sx({ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "baseline" })}>
            <span style={sx({ fontSize: "20px", color: "#fff" })}>{note.label}</span>
            {note.classification ? (
              <span style={sx({ fontSize: "10px", letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,0.36)" })}>
                {formatClassification(note.classification)}
              </span>
            ) : null}
          </div>
        </div>
        {note.metric ? (
          <div
            className="game-summary-mini-panel"
            style={sx({
              display: "inline-flex",
              width: "fit-content",
              maxWidth: "100%",
              padding: "10px 12px",
              border: "1px solid rgba(255,255,255,0.075)",
              background: "rgba(255,255,255,0.035)",
              color: "rgba(255,255,255,0.68)",
              fontSize: "11px",
              letterSpacing: ".08em",
              textTransform: "uppercase",
              lineHeight: 1.35,
            })}
          >
            {note.metric}
          </div>
        ) : null}
        {note.contrast ? (
          <div
            style={sx({
              display: "grid",
              gap: "8px",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.025)",
              padding: "11px 12px",
              maxWidth: "100%",
            })}
          >
            <div style={sx({ display: "grid", gridTemplateColumns: "64px minmax(0, 1fr)", gap: "12px", alignItems: "baseline" })}>
              <span style={sx({ fontSize: "10px", letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)" })}>
                played
              </span>
              <span style={sx({ fontSize: "14px", color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" })}>
                {note.contrast.played}
              </span>
            </div>
            <div style={sx({ display: "grid", gridTemplateColumns: "64px minmax(0, 1fr)", gap: "12px", alignItems: "baseline" })}>
              <span style={sx({ fontSize: "10px", letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)" })}>
                best
              </span>
              <span style={sx({ fontSize: "14px", color: note.contrast.best ? "rgba(255,255,255,0.76)" : "rgba(255,255,255,0.32)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" })}>
                {note.contrast.best || "best move unavailable"}
              </span>
            </div>
            <div style={sx({ fontSize: "11px", color: "rgba(255,255,255,0.34)", letterSpacing: ".06em", textTransform: "uppercase" })}>
              swing {note.contrast.loss} pawns{note.contrast.bestUci ? ` | ${note.contrast.bestUci}` : ""}
            </div>
          </div>
        ) : null}
        <div
          style={sx({
            fontSize: "16px",
            lineHeight: 1.5,
            color: note.classification ? "rgba(255,220,190,0.82)" : "rgba(255,255,255,0.66)",
          })}
        >
          {note.text}
        </div>
      </div>
    );

    if (!note.annotation) return noteBody;

    return (
      <button
        type="button"
        onClick={() => {
          onSelectPly(note.annotation.ply);
          onBoardFocus(note.boardFocus);
        }}
        style={sx({
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.035)",
          color: "inherit",
          width: "100%",
          padding: "0 14px",
          textAlign: "left",
          cursor: "pointer",
          fontFamily: "inherit",
        })}
      >
        {noteBody}
      </button>
    );
  }

  return (
    <div
      style={sx({
        display: "grid",
        gap: "18px",
        minHeight: "560px",
        alignContent: "start",
      })}
    >
      <div style={sx({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" })}>
        <div>
          <div style={sx({ fontSize: "10px", letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,0.22)", marginBottom: "8px" })}>
            phase insight
          </div>
          <div style={sx({ fontSize: "20px", color: "#fff", lineHeight: 1.15 })}>
            Game summary
          </div>
        </div>
        <div style={sx({ fontSize: "11px", color: "rgba(255,255,255,0.34)" })}>
          {activeIndex + 1}/{slides.length}
        </div>
      </div>

      <GameSummaryBlock key={`${activeSlide.kind}-${activeIndex}`} title={activeSlide.section}>
        {renderSlide(activeSlide)}
      </GameSummaryBlock>

      <div style={sx({ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" })}>
        {slides.map((slide, index) => (
          <button
            className={index === activeIndex ? "game-summary-nav-dot is-active" : "game-summary-nav-dot"}
            key={`${slide.kind}-${index}`}
            type="button"
            aria-label={`Show ${slide.section}`}
            onClick={() => goToSlide(index)}
            style={sx({
              border: "none",
              width: index === activeIndex ? "9px" : "7px",
              height: index === activeIndex ? "9px" : "7px",
              borderRadius: "50%",
              background: index === activeIndex ? "#f2f2f2" : "rgba(255,255,255,0.09)",
              cursor: "pointer",
              padding: 0,
              transition: "width 180ms ease, height 180ms ease, background 180ms ease",
            })}
          />
        ))}
      </div>

      <div style={sx({ display: "flex", gap: "16px", alignItems: "center" })}>
        <button
          type="button"
          onClick={() => goToSlide(activeIndex - 1)}
          disabled={activeIndex === 0}
          style={sx({
            border: "none",
            background: "transparent",
            color: activeIndex === 0 ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.48)",
            cursor: activeIndex === 0 ? "default" : "pointer",
            fontSize: "12px",
            fontFamily: "inherit",
            letterSpacing: ".08em",
            textTransform: "uppercase",
            padding: "4px 0",
          })}
        >
          back
        </button>
        <button
          type="button"
          onClick={() => goToSlide(activeIndex + 1)}
          disabled={activeIndex === slides.length - 1}
          style={sx({
            border: "none",
            background: "transparent",
            color: activeIndex === slides.length - 1 ? "rgba(255,255,255,0.18)" : "#fff",
            cursor: activeIndex === slides.length - 1 ? "default" : "pointer",
            fontSize: "12px",
            fontFamily: "inherit",
            letterSpacing: ".08em",
            textTransform: "uppercase",
            padding: "4px 0",
          })}
        >
          next
        </button>
        <button
          type="button"
          onClick={() => goToSlide(0)}
          style={sx({
            border: "none",
            background: "transparent",
            color: "rgba(255,255,255,0.36)",
            cursor: "pointer",
            fontSize: "12px",
            fontFamily: "inherit",
            letterSpacing: ".08em",
            textTransform: "uppercase",
            padding: "4px 0",
          })}
        >
          replay
        </button>
      </div>
    </div>
  );
}

function CurrentEvalBar({ annotation, evaluationOverride = null }) {
  const displayAnnotation = evaluationOverride === null || evaluationOverride === undefined
    ? annotation
    : { evaluation_after: evaluationOverride };
  const whitePercent = evalBarPercent(displayAnnotation);
  const blackPercent = 100 - whitePercent;
  const evaluation = Number(displayAnnotation?.evaluation_after ?? 0);
  const label = `${evaluation > 0 ? "+" : ""}${(evaluation / 100).toFixed(1)}`;

  return (
    <div
      aria-label={`Current evaluation ${label}`}
      title={`Current evaluation ${label}`}
      style={sx({
        alignSelf: "stretch",
        minWidth: "30px",
        width: "30px",
        border: "1px solid rgba(255,255,255,0.08)",
        background: "#202328",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      })}
    >
      <div
        style={sx({
          height: `${blackPercent}%`,
          minHeight: "4%",
          background: "#25282d",
          transition: "height 360ms cubic-bezier(.2,.8,.2,1)",
        })}
      />
      <div
        style={sx({
          height: `${whitePercent}%`,
          minHeight: "4%",
          background: "#eee9df",
          transition: "height 360ms cubic-bezier(.2,.8,.2,1)",
        })}
      />
      <div
        style={sx({
          position: "absolute",
          left: 0,
          right: 0,
          top: "50%",
          borderTop: "1px solid rgba(255,255,255,0.22)",
          transform: "translateY(-0.5px)",
        })}
      />
      <div
        style={sx({
          position: "absolute",
          left: "50%",
          bottom: "8px",
          transform: "translateX(-50%)",
          color: evaluation >= 0 ? "rgba(0,0,0,0.72)" : "rgba(255,255,255,0.72)",
          fontSize: "10px",
          lineHeight: 1,
          pointerEvents: "none",
        })}
      >
        {label}
      </div>
    </div>
  );
}

function formatEngineScore(line) {
  if (line?.mate !== null && line?.mate !== undefined) {
    return `${line.mate > 0 ? "+" : "-"}M${Math.abs(line.mate)}`;
  }

  const pawns = Number(line?.evaluation || 0) / 100;
  return `${pawns > 0 ? "+" : ""}${pawns.toFixed(2)}`;
}

function basePlyFromFen(fen) {
  const [, turn = "w", , , , fullmove = "1"] = String(fen || "").split(" ");
  const moveNumber = Math.max(1, Number.parseInt(fullmove, 10) || 1);
  return (moveNumber - 1) * 2 + (turn === "b" ? 1 : 0);
}

function StockfishLinesPanel({
  fen,
  onPlayLineMove,
  onEvaluationChange,
  isApplyingVariation = false,
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState({
    lineCount: 2,
    depth: 14,
  });
  const [state, setState] = useState({
    status: "idle",
    depth: 0,
    lines: [],
    error: "",
  });
  const lineBasePly = useMemo(() => basePlyFromFen(fen), [fen]);
  const onEvaluationChangeRef = useRef(onEvaluationChange);

  useEffect(() => {
    onEvaluationChangeRef.current = onEvaluationChange;
  }, [onEvaluationChange]);

  useEffect(() => {
    if (!fen) {
      return undefined;
    }

    const controller = new AbortController();
    const loadingTimer = window.setTimeout(() => {
      setState((current) => ({
        status: "loading",
        depth: current.depth,
        lines: current.lines,
        error: "",
      }));
    }, 0);

    const params = new URLSearchParams({
      fen,
      limit: String(settings.lineCount),
      depth: String(settings.depth),
    });

    fetch(apiUrl(`/api/analysis/lines?${params.toString()}`), { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "unable to evaluate position");
        return payload;
      })
      .then((payload) => {
        setState({
          status: "ready",
          depth: payload.depth || 0,
          lines: payload.lines || [],
          error: "",
        });
        onEvaluationChangeRef.current?.(payload.lines?.[0]?.evaluation ?? null);
      })
      .catch((error) => {
        if (error.name === "AbortError") return;
        setState({ status: "error", depth: 0, lines: [], error: error.message || "unable to evaluate position" });
        onEvaluationChangeRef.current?.(null);
      });

    return () => {
      window.clearTimeout(loadingTimer);
      controller.abort();
    };
  }, [fen, settings.lineCount, settings.depth]);

  const panelState = fen ? state : { status: "idle", depth: 0, lines: [], error: "" };
  const rows = panelState.status === "loading" && !panelState.lines.length
    ? Array.from({ length: settings.lineCount }, (_, index) => ({ placeholder: true, multipv: index + 1 }))
    : panelState.lines;

  return (
    <div
      style={sx({
        position: "relative",
        display: "grid",
        gap: "8px",
        padding: "0 0 12px",
        borderBottom: "1px solid rgba(255,255,255,0.055)",
      })}
    >
      <div style={sx({ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "10px", paddingBottom: "7px", borderBottom: "1px solid rgba(255,255,255,0.045)" })}>
        <div style={sx({ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 })}>
          <span style={sx({ color: "rgba(255,255,255,0.42)", fontSize: "10px", letterSpacing: ".14em", textTransform: "uppercase" })}>
            Stockfish
          </span>
          <span style={sx({ color: "rgba(255,255,255,0.34)", fontSize: "11px" })}>
            {isApplyingVariation ? "playing move" : panelState.status === "loading" ? "calculating" : panelState.depth ? `${settings.lineCount} lines / depth ${panelState.depth}` : "live"}
          </span>
        </div>
        <div style={sx({ display: "flex", alignItems: "center", gap: "8px", flex: "0 0 auto" })}>
          <button
            type="button"
            onClick={() => setSettingsOpen((current) => !current)}
            style={sx({
              border: "none",
              borderBottom: settingsOpen ? "1px solid rgba(255,255,255,0.24)" : "1px solid rgba(255,255,255,0.12)",
              background: "transparent",
              color: settingsOpen ? "rgba(255,255,255,0.68)" : "rgba(255,255,255,0.42)",
              cursor: "pointer",
              fontSize: "11px",
              letterSpacing: ".08em",
              textTransform: "uppercase",
              padding: "1px 0 3px",
              fontFamily: "inherit",
            })}
          >
            settings
          </button>
        </div>
      </div>

      {settingsOpen ? (
        <div
          style={sx({
            position: "absolute",
            top: "28px",
            right: 0,
            zIndex: 8,
            width: "220px",
            border: "1px solid rgba(255,255,255,0.1)",
            background: "#0b0b0b",
            boxShadow: "0 18px 40px rgba(0,0,0,0.36)",
            padding: "13px",
            display: "grid",
            gap: "14px",
          })}
        >
          <div style={sx({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" })}>
            <span style={sx({ fontSize: "11px", letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,0.42)" })}>
              engine
            </span>
            <button
              type="button"
              onClick={() => setSettingsOpen(false)}
              style={sx({
                border: "none",
                background: "transparent",
                color: "rgba(255,255,255,0.38)",
                cursor: "pointer",
                fontSize: "14px",
                fontFamily: "inherit",
                padding: 0,
              })}
            >
              x
            </button>
          </div>

          <label style={sx({ display: "grid", gap: "7px" })}>
            <span style={sx({ display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "12px", color: "rgba(255,255,255,0.58)" })}>
              <span>lines</span>
              <span>{settings.lineCount}</span>
            </span>
            <input
              className="engine-slider"
              type="range"
              min="1"
              max="5"
              value={settings.lineCount}
              onChange={(event) => setSettings((current) => ({ ...current, lineCount: Number(event.target.value) }))}
            />
          </label>

          <label style={sx({ display: "grid", gap: "7px" })}>
            <span style={sx({ display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "12px", color: "rgba(255,255,255,0.58)" })}>
              <span>depth</span>
              <span>{settings.depth}</span>
            </span>
            <input
              className="engine-slider"
              type="range"
              min="6"
              max="24"
              value={settings.depth}
              onChange={(event) => setSettings((current) => ({ ...current, depth: Number(event.target.value) }))}
            />
          </label>

          <button
            type="button"
            onClick={() => setSettings({ lineCount: 2, depth: 14 })}
            style={sx({
              justifySelf: "start",
              border: "none",
              borderBottom: "1px solid rgba(255,255,255,0.14)",
              background: "transparent",
              color: "rgba(255,255,255,0.44)",
              cursor: "pointer",
              fontSize: "12px",
              letterSpacing: ".08em",
              textTransform: "uppercase",
              padding: "2px 0",
              fontFamily: "inherit",
            })}
          >
            reset
          </button>
        </div>
      ) : null}

      {panelState.status === "error" ? (
        <div style={sx({ color: "rgba(255,190,190,0.78)", fontSize: "12px", padding: "5px 2px" })}>
          {panelState.error}
        </div>
      ) : (
        <div style={sx({ display: "grid" })}>
          {rows.map((line) => (
            <div
              key={line.placeholder ? `loading-${line.multipv}` : line.multipv}
              style={sx({
                display: "grid",
                gridTemplateColumns: "52px minmax(0, 1fr)",
                alignItems: "center",
                gap: "8px",
                minHeight: "30px",
                padding: "5px 0",
                borderBottom: "1px solid rgba(255,255,255,0.035)",
              })}
            >
              <span
                style={sx({
                  color: line.multipv === 1 && !line.placeholder ? "rgba(255,255,255,0.86)" : "rgba(255,255,255,0.56)",
                  fontSize: "12px",
                  fontWeight: 300,
                  textAlign: "right",
                  fontVariantNumeric: "tabular-nums",
                })}
              >
                {line.placeholder ? "..." : formatEngineScore(line)}
              </span>
              {line.placeholder || !line.san?.length ? (
                <span
                  style={sx({
                    color: line.placeholder ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.72)",
                    fontSize: "12px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  })}
                >
                  {line.placeholder ? "calculating line" : line.move || "no move"}
                </span>
              ) : (
                <span
                  style={sx({
                    display: "flex",
                    alignItems: "center",
                    gap: "3px",
                    minWidth: 0,
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                  })}
                >
                  {line.san.map((moveSan, moveIndex) => (
                    <button
                      key={`${line.multipv}-${moveIndex}-${moveSan}`}
                      type="button"
                      disabled={isApplyingVariation}
                      onClick={() => onPlayLineMove?.(line, moveIndex)}
                      title={`Play through ${moveSan}`}
                      style={sx({
                        border: "none",
                        background: "transparent",
                        color: moveIndex === 0 ? "rgba(255,255,255,0.82)" : "rgba(255,255,255,0.56)",
                        padding: "2px 1px",
                        fontSize: "12px",
                        fontFamily: "inherit",
                        cursor: isApplyingVariation ? "default" : "pointer",
                        opacity: isApplyingVariation ? 0.42 : 1,
                      })}
                    >
                      {formatLineMoveToken(lineBasePly, moveIndex, moveSan)}
                    </button>
                  ))}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AnalysisOverviewPanel({ game, account }) {
  const whiteSummary = buildSideSummary(game, "white");
  const blackSummary = buildSideSummary(game, "black");
  const userColor = playerColorForGame(game, account?.username);

  return (
    <div style={sx({ display: "grid", gap: "18px" })}>
      <div>
        <div style={sx({ fontSize: "10px", letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,0.22)", marginBottom: "8px" })}>
          game review
        </div>
        <div style={sx({ fontSize: "20px", color: "#fff", lineHeight: 1.15 })}>
          Accuracy estimate
        </div>
      </div>
      <AccuracyCard color="white" player={game.white_player} summary={whiteSummary} isUser={userColor === "white"} />
      <AccuracyCard color="black" player={game.black_player} summary={blackSummary} isUser={userColor === "black"} />
    </div>
  );
}

function AnalysisMovesPanel({
  currentAnnotation,
  currentClassification,
  fen,
  moveRows,
  variationBasePly,
  variationMoves = [],
  variationStatus = "idle",
  variationError = "",
  onSelectPly,
  onPlayLineMove,
  onDeleteVariationMove,
  onClearVariation,
  onEvaluationChange,
}) {
  const activeVariationIndex = variationMoves.length - 1;
  const activeVariationMove = activeVariationIndex >= 0 ? variationMoves[activeVariationIndex] : null;
  const activeMoveLabel = activeVariationMove
    ? formatVariationMoveLabel(activeVariationMove, variationBasePly, activeVariationIndex)
    : formatMoveLabel(currentAnnotation);
  const variationLine = variationMoves.length ? formatVariationLine(variationMoves, variationBasePly) : "";

  return (
    <div style={sx({ display: "grid", gap: "14px" })}>
      <div
        style={sx({
          display: "grid",
          gap: "8px",
          paddingBottom: "14px",
          borderBottom: "1px solid rgba(255,255,255,0.055)",
        })}
      >
        <div style={sx({ display: "flex", alignItems: "baseline", gap: "12px", flexWrap: "wrap" })}>
          <span style={sx({ fontSize: "10px", letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,0.22)" })}>
            current
          </span>
          <span style={sx({ fontSize: "21px", color: "#fff" })}>{activeMoveLabel}</span>
          <span style={sx({ display: "flex", gap: "12px", flexWrap: "wrap", color: "rgba(255,255,255,0.38)", fontSize: "12px" })}>
            {activeVariationMove ? (
              <>
                <span>analysis line</span>
                <span>{variationMoves.length} move{variationMoves.length === 1 ? "" : "s"}</span>
              </>
            ) : (
              <>
                <span>{formatClassification(currentClassification)}</span>
                <span>loss {formatCpLoss(currentAnnotation)}</span>
                <span>{currentAnnotation.game_phase}</span>
              </>
            )}
          </span>
        </div>
      </div>

      <StockfishLinesPanel
        fen={fen}
        onPlayLineMove={onPlayLineMove}
        onEvaluationChange={onEvaluationChange}
        isApplyingVariation={variationStatus === "loading"}
      />

      {variationError ? (
        <div style={sx({ fontSize: "12px", color: "#d7aaa6", lineHeight: 1.35 })}>
          {variationError}
        </div>
      ) : null}

      <div style={sx({ fontSize: "11px", letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,0.22)" })}>
        move list
      </div>

      <div
        className="analysis-move-list"
        style={sx({ display: "flex", flexDirection: "column", gap: "1px", height: "430px", overflowY: "auto", scrollbarWidth: "none", msOverflowStyle: "none", paddingRight: "2px" })}
      >
        {variationMoves.length ? (
          <div
            style={sx({
              display: "grid",
              gap: "2px",
              padding: "0 0 10px",
              marginBottom: "8px",
              borderBottom: "1px solid rgba(255,255,255,0.12)",
            })}
          >
            <div
              style={sx({
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
                padding: "4px 2px 6px",
              })}
            >
              <span style={sx({ color: "rgba(255,255,255,0.56)", fontSize: "10px", letterSpacing: ".14em", textTransform: "uppercase" })}>
                variation
              </span>
              <button
                type="button"
                onClick={onClearVariation}
                style={sx({
                  border: "none",
                  background: "transparent",
                  color: "rgba(255,255,255,0.4)",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontFamily: "inherit",
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                  padding: "2px 0",
                })}
              >
                clear
              </button>
            </div>
            <div
              style={sx({
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) auto",
                gap: "10px",
                alignItems: "center",
                minHeight: "34px",
                padding: "7px 8px",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
              })}
            >
              <span
                title={variationLine}
                style={sx({
                  color: "#fff",
                  fontSize: "13px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  minWidth: 0,
                })}
              >
                {variationLine}
              </span>
              <button
                type="button"
                title="Delete last variation move"
                onClick={() => onDeleteVariationMove?.(activeVariationIndex)}
                style={sx({
                  border: "none",
                  background: "transparent",
                  color: "rgba(255,255,255,0.5)",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontFamily: "inherit",
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                  padding: "2px 0",
                })}
              >
                undo
              </button>
            </div>
          </div>
        ) : null}

        {moveRows.map((row) => (
          <div
            key={row.moveIndex}
            style={sx({
              display: "grid",
              gridTemplateColumns: "34px minmax(0, 1fr) minmax(0, 1fr)",
              gap: "5px",
              alignItems: "center",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
              padding: "2px 0",
            })}
          >
            <span style={sx({ fontSize: "11px", color: "rgba(255,255,255,0.2)", letterSpacing: ".08em", paddingLeft: "3px" })}>
              {row.moveIndex}.
            </span>
            <MoveListCell annotation={row.white} activePly={currentAnnotation.ply} onSelectPly={onSelectPly} />
            <MoveListCell annotation={row.black} activePly={currentAnnotation.ply} onSelectPly={onSelectPly} />
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  app: sx({
    background: "#080808",
    minHeight: "100vh",
    width: "100%",
    padding: "56px",
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    fontWeight: 200,
    color: "#fff",
    boxSizing: "border-box",
  }),
  header: sx({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "72px",
    gap: "24px",
    flexWrap: "wrap",
  }),
  logo: sx({
    fontSize: "44px",
    fontWeight: 300,
    letterSpacing: ".08em",
  }),
  sections: sx({
    display: "flex",
    flexDirection: "column",
    gap: "64px",
    maxWidth: "920px",
  }),
  sectionHeader: sx({
    display: "flex",
    alignItems: "baseline",
    gap: "18px",
    marginBottom: "18px",
  }),
  phaseLabel: sx({
    fontSize: "16px",
    letterSpacing: ".16em",
    textTransform: "uppercase",
    fontWeight: 300,
    color: "rgba(255,255,255,0.35)",
  }),
  helperText: sx({
    fontSize: "14px",
    color: "rgba(255,255,255,0.18)",
    fontWeight: 200,
  }),
  dashboardRow: sx({
    display: "grid",
    gridTemplateColumns: "40px minmax(0, 320px) minmax(0, 1fr) 100px 90px",
    gap: "24px",
    alignItems: "baseline",
    padding: "18px 0",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    width: "100%",
    background: "transparent",
    borderLeft: "none",
    borderRight: "none",
    borderTop: "none",
    cursor: "pointer",
    textAlign: "left",
  }),
};

function Bar({ width, opacity = 0.1 }) {
  return (
    <span
      style={sx({
        display: "inline-block",
        width,
        height: "10px",
        background: `rgba(255,255,255,${opacity})`,
        borderRadius: "2px",
        verticalAlign: "middle",
      })}
    />
  );
}

function LogoMark() {
  return (
    <span style={sx({ display: "inline-flex", alignItems: "baseline", gap: "10px", flexWrap: "wrap" })}>
      <span>blunder.ch</span>
      <span
        style={sx({
          border: "1px solid rgba(255,255,255,0.18)",
          color: "rgba(255,255,255,0.5)",
          fontSize: "11px",
          lineHeight: 1,
          letterSpacing: ".12em",
          textTransform: "uppercase",
          padding: "4px 6px",
          borderRadius: "4px",
          transform: "translateY(-7px)",
        })}
      >
        beta
      </span>
    </span>
  );
}

function PlaceholderRow({ index }) {
  return (
    <div
      style={sx({
        border: "1px solid rgba(255,255,255,0.055)",
        padding: "10px",
        minHeight: "230px",
        display: "grid",
        gap: "10px",
      })}
    >
      <Bar width="100%" opacity={0.08} />
      <div style={sx({ aspectRatio: "1 / 1", background: "rgba(255,255,255,0.045)" })} />
      <Bar width={index === 0 ? "80%" : "64%"} />
      <Bar width={index === 0 ? "62%" : "74%"} opacity={0.07} />
    </div>
  );
}

function formatPlayedDate(value) {
  if (!value) return "--";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function MiniBoard({ fen }) {
  if (!fen) {
    return <div style={sx({ aspectRatio: "1 / 1", background: "rgba(255,255,255,0.035)" })} />;
  }

  const board = parseFenBoard(fen);

  return (
    <div
      style={sx({
        aspectRatio: "1 / 1",
        display: "grid",
        gridTemplateColumns: "repeat(8, 1fr)",
        gridTemplateRows: "repeat(8, 1fr)",
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.075)",
        background: "#17191c",
      })}
    >
      {board.flatMap((row, rowIndex) =>
        row.map((piece, columnIndex) => {
          const isLight = (rowIndex + columnIndex) % 2 === 0;
          const pieceImage = pieceImages[piece];

          return (
            <span
              key={`${rowIndex}-${columnIndex}`}
              style={sx({
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: isLight ? "#d4d0c7" : "#3a4046",
                minWidth: 0,
                minHeight: 0,
              })}
            >
              {pieceImage ? (
                <img
                  src={pieceImage}
                  alt=""
                  draggable="false"
                  style={sx({
                    width: "86%",
                    height: "86%",
                    objectFit: "contain",
                    pointerEvents: "none",
                  })}
                />
              ) : null}
            </span>
          );
        })
      )}
    </div>
  );
}

function formatAccuracy(value) {
  return Number.isFinite(Number(value)) ? `${value}%` : "--";
}

function IssueRow({ issue, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(issue)}
      style={sx({
        border: "1px solid rgba(255,255,255,0.055)",
        background: "rgba(255,255,255,0.018)",
        color: "inherit",
        padding: "10px",
        display: "grid",
        gap: "9px",
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "inherit",
        minWidth: 0,
      })}
    >
      <MiniBoard fen={issue.endingFen} />
      <div style={sx({ display: "grid", gap: "5px", minWidth: 0 })}>
        <div style={sx({ fontSize: "13px", lineHeight: 1.25, color: "rgba(255,255,255,0.56)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" })}>
          {issue.opening}
        </div>
        <div style={sx({ fontSize: "12px", color: "rgba(255,255,255,0.42)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" })}>
          {issue.white} vs {issue.black}
        </div>
      </div>
      <div
        style={sx({
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: "6px 10px",
          fontSize: "10px",
          letterSpacing: ".08em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.28)",
        })}
      >
        <span>{issue.result || "--"}</span>
        <span style={sx({ textAlign: "right" })}>{issue.moves} moves</span>
        <span>{formatPlayedDate(issue.playedAt)}</span>
        <span style={sx({ textAlign: "right" })}>W {formatAccuracy(issue.whiteAccuracy)} / B {formatAccuracy(issue.blackAccuracy)}</span>
      </div>
    </button>
  );
}

function Section({ phase, issues, collapsed, onToggle, isConnected, loading, onSelectIssue }) {
  const hasData = issues && issues.length > 0;
  const helperLabel = isConnected
    ? loading
      ? "loading games"
      : `${issues.length} games`
    : "connect account to load";

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        style={sx({
          ...styles.sectionHeader,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: "0 0 4px 0",
          width: "100%",
          textAlign: "left",
        })}
      >
        <span style={styles.phaseLabel}>{phase}</span>
        <span style={styles.helperText}>{helperLabel}</span>
        <span style={sx({ ...styles.helperText, marginLeft: "auto", letterSpacing: ".12em" })}>
          {collapsed ? "expand" : "hide"}
        </span>
      </button>

      {!collapsed && (
        <div
          style={hasData ? sx({
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
            gap: "14px",
          }) : undefined}
        >
          {hasData
            ? issues.map((issue, index) => (
              <IssueRow key={issue.id} issue={issue} index={index} onSelect={onSelectIssue} />
            ))
            : isConnected
              ? (
                <div
                  style={sx({
                    padding: "18px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    color: "rgba(255,255,255,0.22)",
                    fontSize: "14px",
                    letterSpacing: ".08em",
                    textTransform: "uppercase",
                  })}
                >
                  {loading ? "analysis in progress" : "no games ended in this phase"}
                </div>
              )
              : [0, 1].map((index) => <PlaceholderRow key={`${phase}-${index}`} index={index} />)}
        </div>
      )}
    </div>
  );
}

function Nav({ view, onBack }) {
  const isAuthView = view === "signup" || view === "login";
  const showReturnButton = view !== "dash";
  const navButtonStyle = (active = false, emphasis = false) => sx({
    background: active ? "rgba(255,255,255,0.08)" : "transparent",
    border: "1px solid transparent",
    borderColor: active ? "rgba(255,255,255,0.08)" : "transparent",
    color: emphasis ? "#fff" : active ? "rgba(255,255,255,0.66)" : "rgba(255,255,255,0.38)",
    fontSize: "14px",
    fontWeight: 200,
    cursor: "pointer",
    letterSpacing: ".04em",
    padding: "9px 12px",
    fontFamily: "inherit",
    minHeight: "36px",
    borderRadius: "6px",
    transition: "background .15s ease, color .15s ease, border-color .15s ease",
  });

  if (!isAuthView || !showReturnButton) {
    return null;
  }

  return (
    <nav
      style={sx({
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "5px",
        border: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(255,255,255,0.025)",
        borderRadius: "8px",
        flexWrap: "wrap",
      })}
    >
      {showReturnButton ? (
        <button
          type="button"
          onClick={onBack}
          style={navButtonStyle(false)}
        >
          {isAuthView ? "back" : "dashboard"}
        </button>
      ) : null}

    </nav>
  );
}

function AppShell({
  view,
  children,
  onBack,
  onHome,
}) {
  return (
    <div style={styles.app}>
      <div style={styles.header}>
        <button
          type="button"
          onClick={onHome}
          style={sx({
            ...styles.logo,
            background: "transparent",
            border: "none",
            color: "inherit",
            padding: 0,
            cursor: "pointer",
            fontFamily: "inherit",
            textAlign: "left",
          })}
        >
          <LogoMark />
        </button>
        {view === "signup" || view === "login" ? (
          <Nav
            view={view}
            onBack={onBack}
          />
        ) : null}
      </div>

      {children}

      {import.meta.env.DEV ? <DevPanel /> : null}
    </div>
  );
}

function RailMetric({ label, value }) {
  return (
    <div
      style={sx({
        display: "grid",
        gap: "6px",
        padding: "14px 0",
        borderBottom: "1px solid rgba(255,255,255,0.055)",
      })}
    >
      <span
        style={sx({
          fontSize: "11px",
          letterSpacing: ".14em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.2)",
        })}
      >
        {label}
      </span>
      <span
        style={sx({
          fontSize: "18px",
          color: "rgba(255,255,255,0.55)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        })}
      >
        {value}
      </span>
    </div>
  );
}

function RailAction({ children, onClick, emphasis = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={sx({
        width: "100%",
        minHeight: "38px",
        background: emphasis ? "rgba(255,255,255,0.09)" : "transparent",
        border: "1px solid rgba(255,255,255,0.09)",
        borderRadius: "6px",
        color: emphasis ? "#fff" : "rgba(255,255,255,0.48)",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: 200,
        letterSpacing: ".05em",
        fontFamily: "inherit",
        textAlign: "left",
        padding: "9px 12px",
      })}
    >
      {children}
    </button>
  );
}

function DashboardRail({
  account,
  summary,
  issueCount,
  loading,
  onSignUp,
  onLogin,
  onAccount,
  onImport,
  onUpgrade,
  onLogout,
}) {
  const hasAccount = !!account.username;
  const queued = summaryValue(summary, "queuedGames", "queued_games");
  const running = summaryValue(summary, "runningGames", "running_games");

  return (
    <aside
      style={sx({
        borderRight: "1px solid rgba(255,255,255,0.06)",
        paddingRight: "30px",
        minHeight: "560px",
        position: "sticky",
        top: "32px",
      })}
    >
      <div
        style={sx({
          fontSize: "12px",
          letterSpacing: ".18em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.25)",
          marginBottom: "22px",
        })}
      >
        workspace
      </div>

      <div
        style={sx({
          fontSize: "31px",
          lineHeight: 1.12,
          fontWeight: 200,
          color: hasAccount ? "#fff" : "rgba(255,255,255,0.5)",
          marginBottom: "8px",
          wordBreak: "break-word",
        })}
      >
        {hasAccount ? account.username : "connect"}
      </div>

      <div
        style={sx({
          color: "rgba(255,255,255,0.27)",
          fontSize: "14px",
          marginBottom: "28px",
        })}
      >
        {hasAccount ? `${account.platform}${account.isPremium ? " / premium" : ""}` : "login or create an account"}
      </div>

      <div style={sx({ marginBottom: "28px" })}>
        <RailMetric label="games" value={`${summaryValue(summary, "totalGames", "total_games")} loaded`} />
        <RailMetric label="analysis" value={loading ? "refreshing" : `${summaryValue(summary, "analyzedGames", "analyzed_games")} complete`} />
        <RailMetric label="queue" value={`${queued + running} active`} />
        <RailMetric label="listed games" value={issueCount} />
      </div>

      <div style={sx({ display: "grid", gap: "10px" })}>
        {hasAccount ? (
          <>
            <RailAction onClick={onImport} emphasis>import</RailAction>
            <RailAction onClick={onAccount} emphasis>account</RailAction>
            <RailAction onClick={onUpgrade}>{account.isPremium ? "pro" : "upgrade"}</RailAction>
            <RailAction onClick={onLogout}>log out</RailAction>
          </>
        ) : (
          <>
            <RailAction onClick={onLogin}>login</RailAction>
            <RailAction onClick={onSignUp} emphasis>sign up</RailAction>
          </>
        )}
      </div>
    </aside>
  );
}

function Footnote({ onSignUp, label = "analysis requires an account" }) {
  return (
    <div
      style={sx({
        paddingTop: "24px",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        display: "flex",
        alignItems: "baseline",
        gap: "20px",
      })}
    >
      <span
        style={sx({
          fontSize: "13px",
          letterSpacing: ".16em",
          textTransform: "uppercase",
          fontWeight: 200,
          color: "rgba(255,255,255,0.22)",
        })}
      >
        {label}
      </span>

      {onSignUp ? (
        <>
          <span style={sx({ color: "rgba(255,255,255,0.12)", fontSize: "13px" })}>.</span>

          <span
            onClick={onSignUp}
            style={sx({
              fontSize: "13px",
              letterSpacing: ".1em",
              textTransform: "uppercase",
              fontWeight: 200,
              color: "rgba(255,255,255,0.35)",
              borderBottom: "1px solid rgba(255,255,255,0.15)",
              paddingBottom: "1px",
              cursor: "pointer",
            })}
          >
            sign up
          </span>
        </>
      ) : null}
    </div>
  );
}

function SignUpPage({ onBack, onImported, onRegistered }) {
  return (
    <AppShell view="signup" onBack={onBack} onHome={onBack}>
      <SignupWizard onImported={onImported} onRegistered={onRegistered} />
    </AppShell>
  );
}

function LoginPage({ onBack, onLoggedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const inputStyle = sx({
    width: "100%",
    background: "transparent",
    border: "none",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
    color: "#fff",
    fontSize: "17px",
    fontWeight: 200,
    padding: "12px 0",
    outline: "none",
    fontFamily: "inherit",
  });

  const labelStyle = sx({
    display: "block",
    fontSize: "13px",
    letterSpacing: ".12em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.25)",
    fontWeight: 200,
    marginBottom: "10px",
  });

  async function handleSubmit(event) {
    event.preventDefault();

    if (!email.trim() || !password) {
      setStatus("error");
      setMessage("email and password required");
      return;
    }

    setStatus("loading");
    setMessage("checking account");

    try {
      const response = await fetch(apiUrl("/api/users/login"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "unable to login");
      }

      setStatus("success");
      setMessage("logged in");
      onLoggedIn(payload);
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "unable to login");
    }
  }

  return (
    <AppShell view="login" onBack={onBack} onHome={onBack}>
      <form onSubmit={handleSubmit} style={sx({ maxWidth: "420px" })}>
        <p
          style={sx({
            fontSize: "14px",
            letterSpacing: ".16em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.3)",
            fontWeight: 300,
            marginBottom: "44px",
          })}
        >
          Login
        </p>

        <div style={sx({ marginBottom: "34px" })}>
          <label style={labelStyle}>email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={sx({ marginBottom: "44px" })}>
          <label style={labelStyle}>password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            style={inputStyle}
          />
        </div>

        <button
          type="submit"
          disabled={status === "loading"}
          style={sx({
            background: "transparent",
            border: "none",
            color: status === "loading" ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.4)",
            fontSize: "15px",
            fontWeight: 200,
            cursor: status === "loading" ? "default" : "pointer",
            padding: "4px 0",
            borderBottom: "1px solid rgba(255,255,255,0.15)",
            letterSpacing: ".06em",
            fontFamily: "inherit",
          })}
        >
          {status === "loading" ? "checking" : "login"}
        </button>

        {message ? (
          <p
            style={sx({
              marginTop: "18px",
              fontSize: "13px",
              letterSpacing: ".08em",
              textTransform: "uppercase",
              color: status === "error" ? "#c8a2a2" : "rgba(255,255,255,0.35)",
            })}
          >
            {message}
          </p>
        ) : null}
      </form>
    </AppShell>
  );
}

function LoadingPage({ account, onMinimize }) {
  const [quoteIndex, setQuoteIndex] = useState(0);
  const analysisTarget = Math.max(account.totalGames, account.importedGames);
  const completedAnalyses = account.gamesAnalyzed + account.analysisFailed;
  const progress = analysisTarget > 0
    ? Math.min(100, Math.round((completedAnalyses / analysisTarget) * 100))
    : 0;
  const progressLabel = analysisTarget > 0
    ? `analyzed ${Math.min(account.gamesAnalyzed, analysisTarget)} of ${analysisTarget}`
    : account.importStatus === "failed"
      ? "import failed"
      : account.importStatus === "running"
      ? "preparing games"
      : "waiting for worker";
  const loadingStatus = account.importStatus === "completed"
    ? account.analysisRunning > 0
      ? "analysing"
      : account.analysisQueued > 0
        ? "waiting"
        : "complete"
    : account.importStatus || "queued";

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setQuoteIndex((current) => (current + 1) % philosophyQuotes.length);
    }, 3200);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <div style={styles.app}>
      <style>
        {`
          @keyframes premiumLoadingOrbit {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>

      <div style={styles.header}>
        <button
          type="button"
          onClick={onMinimize}
          style={sx({
            ...styles.logo,
            background: "transparent",
            border: "none",
            color: "inherit",
            padding: 0,
            cursor: "pointer",
            fontFamily: "inherit",
            textAlign: "left",
          })}
        >
          <LogoMark />
        </button>
      </div>

      <button
        type="button"
        aria-label="minimize loading"
        onClick={onMinimize}
        style={sx({
          position: "fixed",
          top: "32px",
          right: "36px",
          width: "32px",
          height: "32px",
          border: "1px solid rgba(255,255,255,0.12)",
          background: "transparent",
          color: "rgba(255,255,255,0.42)",
          cursor: "pointer",
          fontSize: "18px",
          lineHeight: 1,
          fontFamily: "inherit",
          fontWeight: 200,
        })}
      >
        x
      </button>

      <div
        style={sx({
          minHeight: "520px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          gap: "34px",
          maxWidth: "620px",
        })}
      >
        <div
          aria-label="loading"
          style={sx({
            width: "92px",
            height: "92px",
            border: "1px solid rgba(255,255,255,0.22)",
            borderRadius: "50%",
            position: "relative",
          })}
        >
          <div
            style={sx({
              position: "absolute",
              inset: "12px",
              borderRadius: "50%",
              animation: "premiumLoadingOrbit 1.4s linear infinite",
            })}
          >
            <span
              style={sx({
                position: "absolute",
                top: "-4px",
                left: "50%",
                width: "8px",
                height: "8px",
                marginLeft: "-4px",
                borderRadius: "50%",
                background: "#fff",
                boxShadow: "0 0 18px rgba(255,255,255,0.35)",
              })}
            />
          </div>
        </div>

        <div>
          <div
            style={sx({
              fontSize: "13px",
              letterSpacing: ".16em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.24)",
              marginBottom: "16px",
            })}
          >
            {loadingStatus}
          </div>
          <div
            style={sx({
              fontSize: "30px",
              lineHeight: 1.4,
              fontWeight: 200,
              color: "rgba(255,255,255,0.64)",
              maxWidth: "560px",
            })}
          >
            {philosophyQuotes[quoteIndex]}
          </div>
        </div>
      </div>

      <div
        style={sx({
          position: "fixed",
          left: "56px",
          right: "56px",
          bottom: "34px",
          display: "grid",
          gap: "12px",
        })}
      >
        <div
          style={sx({
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: "18px",
            color: "rgba(255,255,255,0.28)",
            fontSize: "13px",
            letterSpacing: ".12em",
            textTransform: "uppercase",
          })}
        >
          <span>analysis</span>
          <span>{progressLabel}</span>
        </div>
        <div
          style={sx({
            width: "100%",
            height: "2px",
            background: "rgba(255,255,255,0.08)",
            overflow: "hidden",
          })}
        >
          <div
            style={sx({
              width: `${progress}%`,
              height: "100%",
              background: "rgba(255,255,255,0.58)",
              transition: "width .35s ease",
            })}
          />
        </div>
      </div>
    </div>
  );
}

function badgeIcon(id) {
  if (id === "verified") {
    return (
      <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true" style={sx({ display: "block" })}>
        <path
          d="M20 6 9 17l-5-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (id === "premium") {
    return <span style={sx({ fontSize: "15px", fontWeight: 500, lineHeight: 1 })}>P</span>;
  }

  return <span style={sx({ fontSize: "15px", fontWeight: 500, lineHeight: 1 })}>B</span>;
}

function AccountBadge({ badge }) {
  const isPremium = badge.id === "premium";

  return (
    <span
      title={badge.description || badge.label}
      aria-label={badge.label}
      style={sx({
        width: "31px",
        height: "31px",
        borderRadius: "9px",
        border: isPremium ? "1px solid rgba(155,92,255,0.55)" : "1px solid rgba(255,255,255,0.18)",
        background: isPremium ? "rgba(155,92,255,0.16)" : "rgba(255,255,255,0.07)",
        color: isPremium ? "rgba(210,190,255,0.95)" : "rgba(255,255,255,0.82)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "0 0 auto",
      })}
    >
      {badgeIcon(badge.id)}
    </span>
  );
}

function AccountBadges({ badges }) {
  if (!badges?.length) return null;

  return (
    <div style={sx({ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", marginTop: "14px" })}>
      {badges.map((badge) => (
        <AccountBadge key={badge.id} badge={badge} />
      ))}
    </div>
  );
}

function AccountPage({
  account,
  summary,
  onBack,
  onLogout,
  onSignUp,
  onPremiumChange,
  onUpgrade,
  billingNotice,
}) {
  const hasAccount = !!account.username;
  const [code, setCode] = useState("");
  const [redeemStatus, setRedeemStatus] = useState("idle");
  const [redeemMessage, setRedeemMessage] = useState("");

  const redeemInputStyle = sx({
    width: "100%",
    maxWidth: "280px",
    background: "transparent",
    border: "none",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
    color: "#fff",
    fontSize: "16px",
    fontWeight: 200,
    padding: "10px 0",
    outline: "none",
    fontFamily: "inherit",
  });

  const redeemButtonStyle = sx({
    background: "transparent",
    border: "none",
    borderBottom: "1px solid rgba(255,255,255,0.14)",
    color: redeemStatus === "loading" ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.45)",
    fontSize: "14px",
    fontWeight: 200,
    cursor: redeemStatus === "loading" ? "default" : "pointer",
    letterSpacing: ".06em",
    padding: "10px 0 4px",
    fontFamily: "inherit",
  });

  async function handleRedeem(event) {
    event.preventDefault();

    if (!hasAccount || !code.trim()) {
      setRedeemStatus("error");
      setRedeemMessage("enter a code");
      return;
    }

    setRedeemStatus("loading");
    setRedeemMessage("checking code");

    try {
      const response = await fetch(apiUrl("/api/users/redeem-code"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: account.platform,
          username: account.username,
          code: code.trim(),
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "unable to redeem code");
      }

      setCode("");
      setRedeemStatus("success");
      setRedeemMessage("premium active");
      onPremiumChange(payload);
    } catch (error) {
      setRedeemStatus("error");
      setRedeemMessage(error.message || "unable to redeem code");
    }
  }

  return (
    <AppShell
      view="account"
      account={account}
      onBack={onBack}
      onHome={onBack}
      onAccount={() => {}}
      onLogout={onLogout}
    >
      <div
        style={sx({
          maxWidth: "900px",
          display: "flex",
          flexDirection: "column",
          gap: "70px",
        })}
      >
        <div
          style={sx({
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            paddingBottom: "42px",
          })}
        >
          <div
            style={sx({
              fontSize: "14px",
              letterSpacing: ".14em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.25)",
              marginBottom: "16px",
            })}
          >
            {hasAccount ? account.importStatus || "account" : "connect account to load"}
          </div>

          <div style={sx({ marginBottom: "12px", display: "flex", alignItems: "center" })}>
            {hasAccount ? (
              <div>
                <div style={sx({ fontSize: "52px", fontWeight: 200 })}>{account.username}</div>
                <AccountBadges badges={account.badges} />
              </div>
            ) : (
              <Bar width="260px" opacity={0.12} />
            )}
          </div>

          <div style={sx({ display: "flex", gap: "24px", alignItems: "center", flexWrap: "wrap" })}>
            {hasAccount ? (
              <>
                <span style={sx({ color: "rgba(255,255,255,0.35)", fontSize: "18px" })}>{account.platform}</span>
                {account.email ? (
                  <span style={sx({ color: "rgba(255,255,255,0.35)", fontSize: "18px" })}>{account.email}</span>
                ) : null}
                <span style={sx({ color: "rgba(255,255,255,0.35)", fontSize: "18px" })}>{summaryValue(summary, "totalGames", "total_games")} loaded</span>
                <span style={sx({ color: "rgba(255,255,255,0.35)", fontSize: "18px" })}>{summaryValue(summary, "analyzedGames", "analyzed_games")} analyzed</span>
                <span style={sx({ color: account.isPremium ? "#fff" : "rgba(255,255,255,0.35)", fontSize: "18px" })}>
                  {account.isPremium ? "premium" : "free"}
                </span>
              </>
            ) : (
              <>
                <Bar width="72px" opacity={0.08} />
                <Bar width="130px" opacity={0.08} />
                <Bar width="64px" opacity={0.08} />
              </>
            )}
          </div>
        </div>

        {billingNotice ? (
          <p
            style={sx({
              margin: "-38px 0 0",
              fontSize: "13px",
              letterSpacing: ".08em",
              textTransform: "uppercase",
              color: billingNotice.toLowerCase().includes("unable") ? "#c8a2a2" : "rgba(255,255,255,0.38)",
            })}
          >
            {billingNotice}
          </p>
        ) : null}

        {hasAccount ? (
          <form
            onSubmit={handleRedeem}
            style={sx({
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              maxWidth: "420px",
            })}
          >
            <label
              style={sx({
                display: "block",
                fontSize: "13px",
                letterSpacing: ".12em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.25)",
                fontWeight: 200,
              })}
            >
              redeem code
            </label>
            <div style={sx({ display: "flex", gap: "24px", alignItems: "baseline", flexWrap: "wrap" })}>
              <input
                type="text"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                style={redeemInputStyle}
              />
              <button type="submit" disabled={redeemStatus === "loading"} style={redeemButtonStyle}>
                redeem
              </button>
              {!account.isPremium ? (
                <button type="button" onClick={onUpgrade} style={redeemButtonStyle}>
                  upgrade
                </button>
              ) : null}
            </div>
            {redeemMessage ? (
              <p
                style={sx({
                  margin: 0,
                  fontSize: "13px",
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                  color: redeemStatus === "error" ? "#c8a2a2" : "rgba(255,255,255,0.35)",
                })}
              >
                {redeemMessage}
              </p>
            ) : null}
          </form>
        ) : null}

        {!hasAccount && <Footnote onSignUp={onSignUp} />}
      </div>
    </AppShell>
  );
}

function UpgradeMetric({ label, value }) {
  return (
    <div
      style={sx({
        display: "grid",
        gap: "7px",
        padding: "16px 0",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      })}
    >
      <span
        style={sx({
          fontSize: "11px",
          letterSpacing: ".14em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.24)",
        })}
      >
        {label}
      </span>
      <span style={sx({ fontSize: "22px", color: "rgba(255,255,255,0.72)", fontWeight: 200 })}>
        {value}
      </span>
    </div>
  );
}

function UpgradePage({ account, onBack, onUpgraded }) {
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const hasAccount = !!account.username;

  const buttonStyle = sx({
    justifySelf: "start",
    background: "rgba(255,255,255,0.09)",
    border: "1px solid rgba(255,255,255,0.14)",
    color: status === "loading" ? "rgba(255,255,255,0.35)" : "#fff",
    minHeight: "42px",
    cursor: status === "loading" || !hasAccount ? "default" : "pointer",
    fontSize: "15px",
    fontWeight: 200,
    letterSpacing: ".06em",
    padding: "10px 16px",
    fontFamily: "inherit",
    borderRadius: "6px",
  });

  async function startCheckout() {
    if (!hasAccount || status === "loading") return;

    setStatus("loading");
    setMessage("opening secure checkout");

    try {
      const response = await fetch(apiUrl("/api/billing/checkout-session"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: account.platform,
          username: account.username,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "unable to start checkout");
      }

      if (payload.alreadyPremium) {
        onUpgraded(payload.user);
        setStatus("success");
        setMessage("premium already active");
        return;
      }

      if (!payload.url) {
        throw new Error("Stripe did not return a checkout URL");
      }

      window.location.assign(payload.url);
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "unable to start checkout");
    }
  }

  return (
    <AppShell view="upgrade" onHome={onBack}>
      <div
        style={sx({
          maxWidth: "960px",
          display: "grid",
          gridTemplateColumns: "minmax(280px, 420px) minmax(300px, 1fr)",
          gap: "54px",
          alignItems: "start",
        })}
      >
        <section style={sx({ display: "grid", gap: "28px" })}>
          <div>
            <div
              style={sx({
                fontSize: "13px",
                letterSpacing: ".16em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.28)",
                marginBottom: "12px",
              })}
            >
              upgrade
            </div>
            <h1 style={sx({ margin: 0, fontSize: "48px", fontWeight: 200, color: "#fff" })}>
              Blunder Pro
            </h1>
          </div>

          <div style={sx({ display: "grid", gap: "0" })}>
            <UpgradeMetric label="daily allowance" value="20 games" />
            <UpgradeMetric label="replenish" value="24:00 clock" />
            <UpgradeMetric label="price" value="$9.99 / month" />
          </div>
        </section>

        <section
          style={sx({
            borderLeft: "1px solid rgba(255,255,255,0.06)",
            paddingLeft: "28px",
            display: "grid",
            gap: "24px",
          })}
        >
          <div style={sx({ display: "grid", gap: "10px" })}>
            <span
              style={sx({
                fontSize: "12px",
                letterSpacing: ".14em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.25)",
              })}
            >
              account
            </span>
            <span style={sx({ fontSize: "24px", color: "rgba(255,255,255,0.76)" })}>
              {hasAccount ? `${account.platform} / ${account.username}` : "connect an account first"}
            </span>
            <span style={sx({ fontSize: "15px", lineHeight: 1.55, color: "rgba(255,255,255,0.42)" })}>
              Stripe hosts the payment screen. The server creates the session and activates premium only after a paid checkout is confirmed.
            </span>
          </div>

          <div style={sx({ display: "flex", gap: "22px", alignItems: "baseline", flexWrap: "wrap" })}>
            <button
              type="button"
              disabled={!hasAccount || status === "loading"}
              onClick={startCheckout}
              style={buttonStyle}
            >
              {status === "loading" ? "opening checkout" : account.isPremium ? "premium active" : "upgrade with stripe"}
            </button>
            <button
              type="button"
              onClick={onBack}
              style={sx({
                background: "transparent",
                border: "none",
                borderBottom: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(255,255,255,0.45)",
                cursor: "pointer",
                fontSize: "15px",
                fontWeight: 200,
                fontFamily: "inherit",
                letterSpacing: ".06em",
                padding: "4px 0",
              })}
            >
              dashboard
            </button>
          </div>

          {message ? (
            <p
              style={sx({
                margin: 0,
                fontSize: "13px",
                letterSpacing: ".08em",
                textTransform: "uppercase",
                color: status === "error" ? "#c8a2a2" : "rgba(255,255,255,0.42)",
              })}
            >
              {message}
            </p>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}

const planLabels = {
  free: "Regular",
  pro: "Pro",
};

function formatClock(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return "24:00";

  const totalMinutes = Math.ceil(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return [hours, minutes]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function ImportPage({ account, onBack, onImported }) {
  const [allowance, setAllowance] = useState(null);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const plan = allowance?.isPremium || account.isPremium ? "pro" : "free";
  const limit = plan === "pro" ? allowance?.proLimit ?? 20 : allowance?.freeLimit ?? 5;
  const storedRemaining = plan === "pro" ? allowance?.proRemaining ?? 0 : allowance?.freeRemaining ?? 0;
  const storedUsed = plan === "pro" ? allowance?.proUsed ?? 0 : allowance?.freeUsed ?? 0;
  const resetAt = plan === "pro" ? allowance?.proResetAt : allowance?.freeResetAt;
  const resetMs = resetAt ? new Date(resetAt).getTime() - now : 0;
  const resetElapsed = !!resetAt && resetMs <= 0;
  const remaining = resetElapsed ? limit : storedRemaining;
  const used = resetElapsed ? 0 : storedUsed;
  const clock = used > 0 && remaining < limit ? formatClock(resetMs) : "24:00";
  const canImport = !!allowance && remaining > 0;

  useEffect(() => {
    let isActive = true;

    async function loadAllowance() {
      try {
        setStatus("loading");
        setMessage("checking allowance");
        const params = new URLSearchParams({
          provider: account.platform,
          username: account.username,
        });
        const response = await fetch(apiUrl(`/api/imports/allowance/status?${params.toString()}`));
        const payload = await response.json();

        if (!isActive) return;

        if (!response.ok) {
          throw new Error(payload.error || "unable to check allowance");
        }

        setAllowance(payload);
        setStatus("idle");
        setMessage("");
      } catch (error) {
        if (!isActive) return;
        setStatus("error");
        setMessage(error.message || "unable to check allowance");
      }
    }

    loadAllowance();

    return () => {
      isActive = false;
    };
  }, [account.platform, account.username]);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  async function submit(event) {
    event.preventDefault();

    setStatus("loading");
    setMessage("queueing import");

    try {
      const response = await fetch(apiUrl("/api/imports"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: account.platform,
          username: account.username,
          email: account.email,
          gameTypes: ["rapid", "blitz", "bullet", "classical", "correspondence"],
          gameCount: remaining,
          dateRange: "all",
          plan,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "unable to start import");
      }

      onImported({ importRecord: payload });
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "unable to start import");
    }
  }

  return (
    <AppShell view="import" onHome={onBack}>
      <form onSubmit={submit} style={sx({ maxWidth: "980px", display: "grid", gap: "34px" })}>
        <div>
          <div style={sx({ fontSize: "13px", letterSpacing: ".16em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)", marginBottom: "12px" })}>
            import games
          </div>
          <div style={sx({ fontSize: "34px", fontWeight: 200, color: "#fff" })}>
            {account.platform} / {account.username}
          </div>
        </div>

        <div style={sx({ display: "grid", gridTemplateColumns: "minmax(280px, 360px) minmax(320px, 1fr)", gap: "34px", alignItems: "start" })}>
          <section style={sx({ display: "grid", gap: "14px" })}>
            <div
              style={sx({
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.035)",
                color: "#fff",
                padding: "18px",
                display: "grid",
                gap: "10px",
              })}
            >
              <span style={sx({ display: "block", fontSize: "22px" })}>{planLabels[plan]} daily allowance</span>
              <span style={sx({ color: "rgba(255,255,255,0.42)", fontSize: "14px", lineHeight: 1.5 })}>
                {remaining} of {limit} games available.
              </span>
            </div>

            <div
              style={sx({
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.025)",
                color: "#fff",
                padding: "18px",
                display: "grid",
                gap: "10px",
              })}
            >
              <span style={sx({ display: "block", fontSize: "22px" })}>{clock}</span>
              <span style={sx({ color: "rgba(255,255,255,0.42)", fontSize: "14px", lineHeight: 1.5 })}>
                The allowance replenishes to full when the 24:00 hour clock reaches zero.
              </span>
            </div>
          </section>

          <section style={sx({ display: "grid", gap: "28px" })}>
            {allowance && remaining <= 0 ? (
              <div style={sx({ color: "#ffd29a", fontSize: "13px", letterSpacing: ".08em", textTransform: "uppercase" })}>
                Daily allowance used. Wait for the clock to replenish.
              </div>
            ) : null}

            <div style={sx({ display: "grid", gap: "10px", color: "rgba(255,255,255,0.48)", fontSize: "15px", lineHeight: 1.6 })}>
              <span>{canImport ? `This will analyse ${remaining} game${remaining === 1 ? "" : "s"}.` : "No games are available until the allowance refills."}</span>
              <span>Games are pulled from your recent history across all time controls.</span>
            </div>

            <div style={sx({ display: "flex", gap: "24px", alignItems: "baseline" })}>
              <button
                type="button"
                onClick={onBack}
                style={sx({
                  background: "transparent",
                  border: "none",
                  borderBottom: "1px solid rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.45)",
                  cursor: "pointer",
                  fontSize: "15px",
                  fontWeight: 200,
                  fontFamily: "inherit",
                  letterSpacing: ".06em",
                  padding: "4px 0",
                })}
              >
                dashboard
              </button>
              <button
                type="submit"
                disabled={status === "loading" || !canImport}
                style={sx({
                  background: "transparent",
                  border: "none",
                  borderBottom: "1px solid rgba(255,255,255,0.15)",
                  color: status === "loading" || !canImport ? "rgba(255,255,255,0.2)" : "#fff",
                  cursor: status === "loading" || !canImport ? "default" : "pointer",
                  fontSize: "15px",
                  fontWeight: 200,
                  fontFamily: "inherit",
                  letterSpacing: ".06em",
                  padding: "4px 0",
                })}
              >
                {status === "loading" ? "queueing" : "start import"}
              </button>
            </div>
          </section>
        </div>

        {message ? (
          <p style={sx({ color: status === "error" ? "#c8a2a2" : "rgba(255,255,255,0.42)", fontSize: "13px", letterSpacing: ".08em", textTransform: "uppercase" })}>
            {message}
          </p>
        ) : null}
      </form>
    </AppShell>
  );
}

function explorerPercent(value, total) {
  if (!total) return 0;
  return Math.round((Number(value || 0) / total) * 100);
}

function ExplorerResultBar({ white, draws, black }) {
  const total = Number(white || 0) + Number(draws || 0) + Number(black || 0);
  const whitePercent = explorerPercent(white, total);
  const drawPercent = explorerPercent(draws, total);
  const blackPercent = Math.max(0, 100 - whitePercent - drawPercent);

  return (
    <div
      title={`${whitePercent}% white / ${drawPercent}% draw / ${blackPercent}% black`}
      style={sx({
        display: "grid",
        gridTemplateColumns: `${whitePercent || 1}% ${drawPercent || 1}% ${blackPercent || 1}%`,
        height: "4px",
        overflow: "hidden",
        background: "rgba(255,255,255,0.06)",
      })}
    >
      <span style={sx({ background: "rgba(235,232,224,0.92)" })} />
      <span style={sx({ background: "rgba(165,165,165,0.66)" })} />
      <span style={sx({ background: "rgba(42,45,50,0.98)" })} />
    </div>
  );
}

function OpeningDatabasePanel({ fen, embedded = false }) {
  const [source, setSource] = useState("masters");
  const [query, setQuery] = useState("");
  const [expandedKey, setExpandedKey] = useState("");
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const positionKey = `${source}:${fen}`;
  const showMore = expandedKey === positionKey;
  const limit = showMore ? 60 : 20;

  useEffect(() => {
    if (!fen) return undefined;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        setStatus("loading");
        setError("");

        const params = new URLSearchParams({
          fen,
          source,
          limit: String(limit),
        });
        const response = await fetch(apiUrl(`/api/openings/explorer?${params.toString()}`), {
          signal: controller.signal,
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || "unable to load opening database");
        }

        setData(payload);
        setStatus("idle");
      } catch (requestError) {
        if (requestError.name === "AbortError") return;
        setData(null);
        setStatus("error");
        setError(
          requestError.message?.includes("JSON")
            ? "opening explorer returned an invalid response"
            : requestError.message || "unable to load opening database"
        );
      }
    }, 260);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [fen, source, limit]);

  const totalGames = (data?.totals?.white || 0) + (data?.totals?.draws || 0) + (data?.totals?.black || 0);
  const openingName = [data?.opening?.eco, data?.opening?.name].filter(Boolean).join(" / ");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredGames = (data?.games || []).filter((game) => {
    if (!normalizedQuery) return true;

    return [
      game.white?.name,
      game.black?.name,
      game.event,
      game.year,
      game.result,
    ].some((value) => String(value || "").toLowerCase().includes(normalizedQuery));
  });
  const visibleGames = filteredGames.slice(0, limit);

  const Container = embedded ? "section" : "aside";

  return (
    <Container
      className={embedded ? undefined : "analysis-move-list"}
      style={sx({
        minWidth: 0,
        display: "grid",
        gap: "14px",
        alignContent: "start",
        ...(embedded
          ? {}
          : {
            borderLeft: "1px solid rgba(255,255,255,0.06)",
            paddingLeft: "18px",
            height: ANALYSIS_SIDE_PANEL_HEIGHT,
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }),
      })}
    >
      <div>
        <div style={sx({ fontSize: "10px", letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,0.22)", marginBottom: "8px" })}>
          opening database
        </div>
        <div style={sx({ fontSize: "18px", color: "#fff", lineHeight: 1.2 })}>
          {openingName || "Position explorer"}
        </div>
        <div style={sx({ marginTop: "7px", fontSize: "12px", color: "rgba(255,255,255,0.36)", lineHeight: 1.35 })}>
          {status === "loading" ? "loading matching games" : totalGames ? `${totalGames.toLocaleString()} matching games` : "no matching games yet"}
        </div>
      </div>

      <div style={sx({ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "7px" })}>
        {["masters", "lichess"].map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setSource(option)}
            style={sx({
              border: source === option ? "1px solid rgba(255,255,255,0.34)" : "1px solid rgba(255,255,255,0.08)",
              background: source === option ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.025)",
              color: source === option ? "#fff" : "rgba(255,255,255,0.44)",
              minHeight: "30px",
              fontSize: "11px",
              letterSpacing: ".08em",
              textTransform: "uppercase",
              cursor: "pointer",
              fontFamily: "inherit",
            })}
          >
            {option}
          </button>
        ))}
      </div>

      <label>
        <span style={sx({ display: "block", fontSize: "10px", letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,0.22)", marginBottom: "7px" })}>
          search games
        </span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="player, event, year, result"
          style={sx({
            width: "100%",
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.035)",
            color: "#fff",
            minHeight: "34px",
            padding: "8px 10px",
            fontFamily: "inherit",
            fontSize: "13px",
            outline: "none",
          })}
        />
      </label>

      {data?.moves?.length ? (
        <section style={sx({ display: "grid", gap: "8px" })}>
          <div style={sx({ fontSize: "10px", letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,0.22)" })}>
            common replies
          </div>
          {data.moves.slice(0, 6).map((move) => (
            <div
              key={move.uci}
              style={sx({
                display: "grid",
                gap: "5px",
                padding: "8px 0",
                borderBottom: "1px solid rgba(255,255,255,0.045)",
              })}
            >
              <div style={sx({ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px" })}>
                <span style={sx({ fontSize: "14px", color: "#fff" })}>{move.san}</span>
                <span style={sx({ fontSize: "11px", color: "rgba(255,255,255,0.34)" })}>
                  {move.total.toLocaleString()}
                </span>
              </div>
              <ExplorerResultBar white={move.white} draws={move.draws} black={move.black} />
            </div>
          ))}
        </section>
      ) : null}

      <section style={sx({ display: "grid", gap: "8px" })}>
        <div style={sx({ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "12px" })}>
          <div style={sx({ fontSize: "10px", letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,0.22)" })}>
            matching games
          </div>
          <div style={sx({ fontSize: "11px", color: "rgba(255,255,255,0.3)" })}>
            {visibleGames.length}/{filteredGames.length}
          </div>
        </div>

        {status === "error" ? (
          <div style={sx({ fontSize: "12px", color: "#d9aaa2", lineHeight: 1.45 })}>
            {error}
            {error.includes("LICHESS_TOKEN") ? (
              <span style={sx({ display: "block", marginTop: "8px", color: "rgba(255,255,255,0.42)" })}>
                Create a Lichess API token, add it as LICHESS_TOKEN in backend/.env, then restart the backend.
              </span>
            ) : null}
          </div>
        ) : null}

        {visibleGames.length ? (
          <div
            className="analysis-move-list"
            style={sx({
              display: "grid",
              gap: "7px",
              maxHeight: "295px",
              overflowY: "auto",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            })}
          >
            {visibleGames.map((game) => (
              <a
                key={game.id || `${game.white?.name}-${game.black?.name}-${game.year}`}
                href={game.url || undefined}
                target="_blank"
                rel="noreferrer"
                style={sx({
                  display: "grid",
                  gap: "5px",
                  textDecoration: "none",
                  border: "1px solid rgba(255,255,255,0.055)",
                  background: "rgba(255,255,255,0.025)",
                  padding: "9px",
                  color: "inherit",
                })}
              >
                <div style={sx({ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "baseline" })}>
                  <span style={sx({ minWidth: 0, fontSize: "12px", color: "rgba(255,255,255,0.74)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" })}>
                    {game.white?.name || "White"} vs {game.black?.name || "Black"}
                  </span>
                  <span style={sx({ fontSize: "11px", color: "rgba(255,255,255,0.34)", flex: "0 0 auto" })}>
                    {game.result}
                  </span>
                </div>
                <div style={sx({ display: "flex", justifyContent: "space-between", gap: "10px", fontSize: "10px", color: "rgba(255,255,255,0.3)" })}>
                  <span style={sx({ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" })}>
                    {game.event || source}
                  </span>
                  <span>{game.year}</span>
                </div>
              </a>
            ))}
          </div>
        ) : status === "loading" ? (
          <div style={sx({ fontSize: "12px", color: "rgba(255,255,255,0.36)" })}>searching database</div>
        ) : (
          <div style={sx({ fontSize: "12px", color: "rgba(255,255,255,0.36)" })}>no games match this filter</div>
        )}

        {filteredGames.length > 20 ? (
          <button
            type="button"
            onClick={() => setExpandedKey((current) => (current === positionKey ? "" : positionKey))}
            style={sx({
              justifySelf: "start",
              border: "none",
              background: "transparent",
              borderBottom: "1px solid rgba(255,255,255,0.16)",
              color: "rgba(255,255,255,0.5)",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: "12px",
              letterSpacing: ".08em",
              textTransform: "uppercase",
              padding: "3px 0",
            })}
          >
            {showMore ? "show 20" : "show more"}
          </button>
        ) : null}
      </section>
    </Container>
  );
}

function AnalysisPage({ game, selectedPly, onSelectPly, onHome, account }) {
  const [linePreview, setLinePreview] = useState(null);
  const [analysisTab, setAnalysisTab] = useState("overview");
  const [summaryBoardFocus, setSummaryBoardFocus] = useState(null);
  const [variationMoves, setVariationMoves] = useState([]);
  const [variationStatus, setVariationStatus] = useState("idle");
  const [variationError, setVariationError] = useState("");
  const [liveEvaluation, setLiveEvaluation] = useState(null);
  const currentAnnotation =
    game.annotations.find((annotation) => annotation.ply === selectedPly) || game.annotations[0];
  const actualBoardFen = currentAnnotation?.fen_after || currentAnnotation?.fen_before || game.annotations[0]?.fen_before;
  const variationBasePly = currentAnnotation?.ply || 0;
  const activeVariationIndex = variationMoves.length - 1;
  const activeVariationMove = activeVariationIndex >= 0 ? variationMoves[activeVariationIndex] : null;
  const activeVariationAnnotation = activeVariationMove
    ? variationAnnotationFromMove(activeVariationMove, variationBasePly, activeVariationIndex)
    : null;
  const activeAnalysisFen = activeVariationMove?.fenAfter || actualBoardFen;
  const boardFen = linePreview?.fen || activeAnalysisFen;
  const displayedBoardFen = summaryBoardFocus?.fen || boardFen;
  const displayedAnnotation = summaryBoardFocus
    ? summaryBoardFocus.annotation
    : activeVariationAnnotation || currentAnnotation;
  const displayedEvaluationOverride = !summaryBoardFocus && liveEvaluation !== null ? liveEvaluation : null;
  const moveRows = groupAnnotationsByMove(game.annotations);
  const currentClassification = visualClassification(currentAnnotation);

  function clearVariation() {
    setVariationMoves([]);
    setVariationStatus("idle");
    setVariationError("");
    setLiveEvaluation(null);
  }

  function handleSelectPly(ply) {
    setLinePreview(null);
    setSummaryBoardFocus(null);
    clearVariation();
    onSelectPly(ply);
  }

  function handleAnalysisTab(tab) {
    setAnalysisTab(tab);
    if (tab !== "summary") setSummaryBoardFocus(null);
  }

  async function requestAnalysisMove(body) {
    const response = await fetch(apiUrl("/api/analysis/move"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "move is illegal");
    }

    return payload;
  }

  async function handleBoardMove({ from, to }) {
    if (!activeAnalysisFen || variationStatus === "loading") return;

    setVariationStatus("loading");
    setVariationError("");
    setLiveEvaluation(null);
    setSummaryBoardFocus(null);

    try {
      const move = await requestAnalysisMove({ fen: activeAnalysisFen, from, to });
      setVariationMoves((current) => [...current, { ...move, source: "board" }]);
      setAnalysisTab("moves");
    } catch (error) {
      setVariationError(error.message || "move is illegal");
    } finally {
      setVariationStatus("idle");
    }
  }

  async function handlePlayLineMove(line, moveIndex) {
    const uciMoves = (line?.pv || []).slice(0, moveIndex + 1);
    if (!uciMoves.length || !activeAnalysisFen || variationStatus === "loading") return;

    setVariationStatus("loading");
    setVariationError("");
    setLiveEvaluation(null);
    setSummaryBoardFocus(null);

    try {
      let cursorFen = activeAnalysisFen;
      const nextMoves = [];

      for (const uci of uciMoves) {
        const move = await requestAnalysisMove({ fen: cursorFen, uci });
        nextMoves.push({ ...move, source: "engine" });
        cursorFen = move.fenAfter;
      }

      setVariationMoves((current) => [...current, ...nextMoves]);
      setAnalysisTab("moves");
    } catch (error) {
      setVariationError(error.message || "unable to play engine line");
    } finally {
      setVariationStatus("idle");
    }
  }

  function handleDeleteVariationMove(index) {
    setVariationMoves((current) => current.slice(0, index));
    setVariationError("");
    setLiveEvaluation(null);
  }

  function handleEvaluationChange(value) {
    const nextEvaluation = Number(value);
    setLiveEvaluation(Number.isFinite(nextEvaluation) ? nextEvaluation : null);
  }

  useEffect(() => {
    function handleKeyDown(event) {
      const target = event.target;
      const isTypingTarget =
        target instanceof HTMLInputElement
        || target instanceof HTMLTextAreaElement
        || target instanceof HTMLSelectElement
        || target?.isContentEditable;

      if (isTypingTarget || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;

      const currentIndex = game.annotations.findIndex((annotation) => annotation.ply === currentAnnotation.ply);
      const nextIndex = event.key === "ArrowRight"
        ? Math.min(game.annotations.length - 1, currentIndex + 1)
        : Math.max(0, currentIndex - 1);
      const nextAnnotation = game.annotations[nextIndex];

      if (!nextAnnotation || nextAnnotation.ply === currentAnnotation.ply) return;

      event.preventDefault();
      setLinePreview(null);
      setSummaryBoardFocus(null);
      setVariationMoves([]);
      setVariationStatus("idle");
      setVariationError("");
      setLiveEvaluation(null);
      onSelectPly(nextAnnotation.ply);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentAnnotation.ply, game.annotations, onSelectPly]);

  return (
    <AppShell view="analysis" onHome={onHome}>
      <div
        style={sx({
          maxWidth: "1540px",
          display: "grid",
          gridTemplateColumns: "390px minmax(420px, 620px) minmax(280px, 360px)",
          gap: "28px",
          alignItems: "start",
        })}
      >
        <div
          className="analysis-move-list"
          style={sx({
            borderRight: "1px solid rgba(255,255,255,0.06)",
            paddingRight: "20px",
            height: ANALYSIS_SIDE_PANEL_HEIGHT,
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          })}
        >
          <div
            style={sx({
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1.12fr",
              gap: "8px",
              marginBottom: "18px",
            })}
          >
            {["overview", "opening", "summary"].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => handleAnalysisTab(tab)}
                style={sx({
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: analysisTab === tab ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.025)",
                  color: analysisTab === tab ? "#fff" : "rgba(255,255,255,0.42)",
                  minHeight: "32px",
                  fontSize: "12px",
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  fontFamily: "inherit",
                })}
              >
                {tab === "overview" ? "overview" : tab === "opening" ? "opening" : "summary"}
              </button>
            ))}
          </div>

          {analysisTab === "overview" ? (
            <AnalysisOverviewPanel
              game={game}
              account={account}
            />
          ) : analysisTab === "opening" ? (
            <OpeningDatabasePanel fen={displayedBoardFen} embedded />
          ) : (
            <GameSummaryPanel
              key={game.id}
              game={game}
              account={account}
              onSelectPly={handleSelectPly}
              onBoardFocus={setSummaryBoardFocus}
            />
          )}
        </div>

        <div style={sx({ display: "flex", flexDirection: "column", gap: "12px" })}>
          <div>
            <div style={sx({ fontSize: "11px", letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: "6px" })}>
              {prettifyOpeningName(game)}
            </div>
            <div style={sx({ fontSize: "18px", color: "rgba(255,255,255,0.58)" })}>
              {game.white_player} vs {game.black_player}
            </div>
          </div>

          <div
            style={sx({
              display: "grid",
              gridTemplateColumns: "minmax(0, 620px) 30px",
              gap: "8px",
              alignItems: "stretch",
              maxWidth: "658px",
            })}
          >
            <Board
              key={game.id || "analysis-board"}
              fen={displayedBoardFen}
              annotation={displayedAnnotation}
              isExploringLine={Boolean(linePreview || summaryBoardFocus || activeVariationMove)}
              maxWidth="620px"
              interactive={!summaryBoardFocus}
              onMove={summaryBoardFocus ? null : handleBoardMove}
              isMoveBusy={variationStatus === "loading"}
              autoArrows={summaryBoardFocus?.arrows || []}
              autoCircles={summaryBoardFocus?.circles || []}
            />
            <CurrentEvalBar
              annotation={displayedAnnotation}
              evaluationOverride={displayedEvaluationOverride}
            />
          </div>
        </div>

        <div
          className="analysis-move-list"
          style={sx({
            borderLeft: "1px solid rgba(255,255,255,0.06)",
            paddingLeft: "18px",
            height: ANALYSIS_SIDE_PANEL_HEIGHT,
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          })}
        >
          <AnalysisMovesPanel
            currentAnnotation={currentAnnotation}
            currentClassification={currentClassification}
            fen={activeAnalysisFen}
            moveRows={moveRows}
            variationBasePly={variationBasePly}
            variationMoves={variationMoves}
            variationStatus={variationStatus}
            variationError={variationError}
            onSelectPly={handleSelectPly}
            onPlayLineMove={handlePlayLineMove}
            onDeleteVariationMove={handleDeleteVariationMove}
            onClearVariation={clearVariation}
            onEvaluationChange={handleEvaluationChange}
          />
        </div>
      </div>
    </AppShell>
  );
}

export default function App() {
  const [view, setView] = useState("dash");
  const [account, setAccount] = useState(readStoredAccount);
  const [dashboard, setDashboard] = useState(createEmptyDashboard);
  const [collapsedSections, setCollapsedSections] = useState(createCollapsedSections);
  const [dashboardSummary, setDashboardSummary] = useState(createDashboardSummary);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState("");
  const [dashboardReloadKey, setDashboardReloadKey] = useState(0);
  const [latestGame, setLatestGame] = useState(null);
  const [selectedPly, setSelectedPly] = useState(null);
  const [billingNotice, setBillingNotice] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!account.username || !account.platform) {
      window.localStorage.removeItem(ACCOUNT_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(
      ACCOUNT_STORAGE_KEY,
      JSON.stringify(storedAccountPayload(account))
    );
  }, [account]);

  function handleLogout() {
    setAccount(createEmptyAccount());
    setDashboard(createEmptyDashboard());
    setDashboardSummary(createDashboardSummary());
    setCollapsedSections(createCollapsedSections());
    setLatestGame(null);
    setSelectedPly(null);
    setDashboardError("");
    setDashboardLoading(false);
    setBillingNotice("");
    setDashboardReloadKey((current) => current + 1);
    setView("dash");
  }

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    if (!account.username || !account.platform) return undefined;

    const params = new URLSearchParams(window.location.search);
    const checkoutState = params.get("checkout");
    const sessionId = params.get("session_id");

    if (checkoutState === "cancelled") {
      const timeoutId = window.setTimeout(() => {
        setBillingNotice("checkout cancelled");
        setView("upgrade");
        window.history.replaceState({}, "", `${window.location.pathname}${window.location.hash}`);
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }

    if (checkoutState !== "success" || !sessionId) {
      return undefined;
    }

    let isActive = true;

    async function confirmCheckout() {
      try {
        setBillingNotice("confirming checkout");
        const response = await fetch(apiUrl("/api/billing/confirm-session"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            provider: account.platform,
            username: account.username,
            sessionId,
          }),
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || "unable to confirm checkout");
        }

        if (!isActive) return;

        setAccount((current) => ({
          ...current,
          isPremium: !!payload.is_premium,
          badges: payload.badges || current.badges,
        }));
        setBillingNotice("premium active");
        setView("account");
      } catch (error) {
        if (!isActive) return;
        setBillingNotice(error.message || "unable to confirm checkout");
        setView("upgrade");
      } finally {
        window.history.replaceState({}, "", `${window.location.pathname}${window.location.hash}`);
      }
    }

    confirmCheckout();

    return () => {
      isActive = false;
    };
  }, [account.username, account.platform]);

  useEffect(() => {
    if (!account.username || !account.platform) {
      return undefined;
    }

    let isActive = true;

    const loadUserStatus = async () => {
      try {
        const params = new URLSearchParams({
          provider: account.platform,
          username: account.username,
        });
        const response = await fetch(apiUrl(`/api/users/status?${params.toString()}`));
        const payload = await response.json();

        if (!response.ok || !isActive) {
          return;
        }

        setAccount((current) => ({
          ...current,
          isPremium: !!payload.is_premium,
          badges: payload.badges || [],
        }));
      } catch {
        // Premium is backend-owned; leave the current UI status alone if the refresh fails.
      }
    };

    loadUserStatus();

    return () => {
      isActive = false;
    };
  }, [account.username, account.platform]);

  useEffect(() => {
    if (!account.importId || !["queued", "running"].includes(account.importStatus)) {
      return undefined;
    }

    const pollImport = async () => {
      try {
        const response = await fetch(apiUrl(`/api/imports/${account.importId}`));
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || "unable to refresh import");
        }

        setAccount((current) => ({
          ...current,
          importStatus: payload.status,
          importedGames: payload.imported_games,
          duplicateGames: payload.duplicate_games,
          totalGames: payload.total_games,
        }));
      } catch {
        setAccount((current) => ({
          ...current,
          importStatus: current.importStatus === "completed" ? current.importStatus : "failed",
        }));
      }
    };

    pollImport();
    const intervalId = window.setInterval(pollImport, 3000);

    return () => window.clearInterval(intervalId);
  }, [account.importId, account.importStatus]);

  useEffect(() => {
    if (view !== "loading") {
      return undefined;
    }

    const target = Math.max(account.totalGames, account.importedGames);
    const importFailed = account.importStatus === "failed";
    const importDone = account.importStatus === "completed";
    const analysisPending = account.analysisQueued + account.analysisRunning > 0;
    const analysisDone =
      target === 0
      || !analysisPending
      || account.gamesAnalyzed + account.analysisFailed >= target;

    if (!importFailed && (!importDone || !analysisDone)) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setDashboardReloadKey((current) => current + 1);
      setView("dash");
    }, 900);
    return () => window.clearTimeout(timeoutId);
  }, [
    view,
    account.importStatus,
    account.gamesAnalyzed,
    account.analysisFailed,
    account.analysisQueued,
    account.analysisRunning,
    account.importedGames,
    account.totalGames,
  ]);

  useEffect(() => {
    if (view !== "loading" || !account.username || !account.platform) {
      return undefined;
    }

    let isActive = true;

    const pollAnalysisProgress = async () => {
      try {
        const params = new URLSearchParams({
          provider: account.platform,
          username: account.username,
        });
        const response = await fetch(apiUrl(`/api/games?${params.toString()}`));
        const payload = await response.json();

        if (!response.ok || !isActive) {
          return;
        }

        const summary = payload.summary || createDashboardSummary();
        setDashboardSummary(summary);
        setAccount((current) => ({
          ...current,
          gamesAnalyzed: summaryValue(summary, "analyzedGames", "analyzed_games"),
          analysisFailed: summaryValue(summary, "failedGames", "failed_games"),
          analysisQueued: summaryValue(summary, "queuedGames", "queued_games"),
          analysisRunning: summaryValue(summary, "runningGames", "running_games"),
          importedGames: Math.max(
            current.importedGames,
            summaryValue(summary, "totalGames", "total_games")
          ),
          totalGames: Math.max(
            current.totalGames,
            summaryValue(summary, "totalGames", "total_games")
          ),
        }));
      } catch {
        // Keep the current progress if a transient poll fails.
      }
    };

    pollAnalysisProgress();
    const intervalId = window.setInterval(pollAnalysisProgress, 3000);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [view, account.username, account.platform]);

  useEffect(() => {
    if (view !== "dash" || !account.username || !account.platform) {
      return undefined;
    }

    let isActive = true;

    const loadGame = async () => {
      try {
        setDashboardLoading(true);
        setDashboardError("");
        setLatestGame(null);
        setDashboard(createEmptyDashboard());
        setSelectedPly(null);

        const params = new URLSearchParams({
          provider: account.platform,
          username: account.username,
        });

        const response = await fetch(apiUrl(`/api/games?${params.toString()}`));
        const payload = await response.json();

        if (!isActive) return;

        if (!response.ok) {
          throw new Error(payload.error || "unable to load dashboard");
        }

        const summary = payload.summary || createDashboardSummary();

        setDashboardSummary(summary);
        setAccount((current) => ({
          ...current,
          gamesAnalyzed: summaryValue(summary, "analyzedGames", "analyzed_games"),
          analysisFailed: summaryValue(summary, "failedGames", "failed_games"),
          analysisQueued: summaryValue(summary, "queuedGames", "queued_games"),
          analysisRunning: summaryValue(summary, "runningGames", "running_games"),
          importedGames: Math.max(
            current.importedGames,
            summaryValue(summary, "totalGames", "total_games")
          ),
          totalGames: Math.max(
            current.totalGames,
            summaryValue(summary, "totalGames", "total_games")
          ),
        }));

        setLatestGame(null);
        setSelectedPly(null);
        setDashboard(payload.sections || createEmptyDashboard());
      } catch (error) {
        if (!isActive) return;
        setLatestGame(null);
        setDashboard(createEmptyDashboard());
        setDashboardError(error.message || "unable to load analysis");
      } finally {
        if (isActive) {
          setDashboardLoading(false);
        }
      }
    };

    loadGame();

    return () => {
      isActive = false;
    };
  }, [view, account.username, account.platform, dashboardReloadKey]);

  async function openIssue(issue) {
    const gameId = issue.gameId || issue.id;

    if (!gameId) return;

    try {
      setDashboardLoading(true);
      setDashboardError("");
      const response = await fetch(apiUrl(`/api/games/${gameId}`));
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "unable to load game");
      }

      setLatestGame(payload);
      setSelectedPly(issue.ply || payload.annotations?.find((annotation) => ["blunder", "miss"].includes(visualClassification(annotation)))?.ply || payload.annotations?.[0]?.ply || null);
      setView("analysis");
    } catch (error) {
      setDashboardError(error.message || "unable to load game");
    } finally {
      setDashboardLoading(false);
    }
  }

  if (view === "signup") {
    return (
      <SignUpPage
        onBack={() => setView("dash")}
        onRegistered={(user) => {
          const nextAccount = {
            ...createEmptyAccount(),
            email: user.email ?? "",
            username: user.username,
            platform: user.provider,
            isPremium: !!user.is_premium,
            badges: user.badges || [],
          };

          setAccount(nextAccount);
          setCollapsedSections(createCollapsedSections());

          if (typeof window !== "undefined") {
            window.localStorage.setItem(
              ACCOUNT_STORAGE_KEY,
              JSON.stringify(storedAccountPayload(nextAccount))
            );
          }
        }}
        onImported={({ email, username, platform, importRecord }) => {
          setAccount({
            ...createEmptyAccount(),
            email,
            username,
            platform,
            importId: importRecord.id,
            importStatus: importRecord.status,
            importedGames: importRecord.imported_games ?? 0,
            duplicateGames: importRecord.duplicate_games ?? 0,
            totalGames: importRecord.total_games ?? 0,
            isPremium: importRecord.plan === "pro",
          });
          setCollapsedSections(createCollapsedSections());
          setView("loading");
        }}
      />
    );
  }

  if (view === "login") {
    return (
      <LoginPage
        onBack={() => setView("dash")}
        onLoggedIn={(user) => {
          setAccount({
            ...createEmptyAccount(),
            email: user.email ?? "",
            username: user.username,
            platform: user.provider,
            isPremium: !!user.is_premium,
            badges: user.badges || [],
          });
          setCollapsedSections(createCollapsedSections());
          setDashboardReloadKey((current) => current + 1);
          setView("dash");
        }}
      />
    );
  }

  if (view === "loading") {
    return (
      <LoadingPage
        account={account}
        onMinimize={() => {
          setDashboardReloadKey((current) => current + 1);
          setView("dash");
        }}
      />
    );
  }

  if (view === "account") {
    return (
      <AccountPage
        account={account}
        summary={dashboardSummary}
        onBack={() => setView("dash")}
        onLogout={handleLogout}
        onSignUp={() => setView("signup")}
        onUpgrade={() => setView("upgrade")}
        billingNotice={billingNotice}
        onPremiumChange={(user) =>
          setAccount((current) => ({
            ...current,
            isPremium: !!user.is_premium,
            badges: user.badges || current.badges,
          }))
        }
      />
    );
  }

  if (view === "upgrade") {
    return (
      <UpgradePage
        account={account}
        onBack={() => setView("dash")}
        onUpgraded={(user) => {
          if (user) {
            setAccount((current) => ({
              ...current,
              isPremium: !!user.is_premium,
              badges: user.badges || current.badges,
            }));
          }
          setBillingNotice("premium active");
          setView("account");
        }}
      />
    );
  }

  if (view === "import" && account.username) {
    return (
      <ImportPage
        account={account}
        onBack={() => setView("dash")}
        onImported={({ importRecord }) => {
          setAccount((current) => ({
            ...current,
            importId: importRecord.id,
            importStatus: importRecord.status,
            importedGames: importRecord.imported_games ?? 0,
            duplicateGames: importRecord.duplicate_games ?? 0,
            totalGames: importRecord.total_games ?? 0,
          }));
          setView("loading");
        }}
      />
    );
  }

  if (view === "analysis" && latestGame) {
    return (
      <AnalysisPage
        game={latestGame}
        selectedPly={selectedPly}
        onSelectPly={setSelectedPly}
        onHome={() => setView("dash")}
        account={account}
      />
    );
  }

  const issueCount = Object.values(dashboard).flat().length;
  const hasAnyData = issueCount > 0;

  return (
    <AppShell
      view="dash"
      account={account}
      onAccount={() => setView("account")}
      onBack={() => setView("dash")}
      onHome={() => setView("dash")}
      onLogout={handleLogout}
    >
      <div
        style={sx({
          maxWidth: "1240px",
          display: "grid",
          gridTemplateColumns: "260px minmax(0, 1fr)",
          gap: "46px",
          alignItems: "start",
        })}
      >
        <DashboardRail
          account={account}
          summary={dashboardSummary}
          issueCount={issueCount}
          loading={dashboardLoading}
          onSignUp={() => setView("signup")}
          onLogin={() => setView("login")}
          onAccount={() => setView("account")}
          onImport={() => setView("import")}
          onUpgrade={() => setView("upgrade")}
          onLogout={handleLogout}
        />

        <main style={sx({ minWidth: 0 })}>
          <div
            style={sx({
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: "24px",
              marginBottom: "40px",
              paddingBottom: "18px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            })}
          >
            <div>
              <div
                style={sx({
                  fontSize: "12px",
                  letterSpacing: ".16em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.23)",
                  marginBottom: "9px",
                })}
              >
                latest analysis
              </div>
              <div
                style={sx({
                  fontSize: "26px",
                  color: "rgba(255,255,255,0.7)",
                  fontWeight: 200,
                })}
              >
                analyzed games
              </div>
            </div>
            <div
              style={sx({
                fontSize: "13px",
                color: "rgba(255,255,255,0.28)",
                letterSpacing: ".08em",
                textTransform: "uppercase",
              })}
            >
              {hasAnyData ? `${issueCount} games` : dashboardLoading ? "loading" : "no games"}
            </div>
          </div>

          <div style={styles.sections}>
            {phases.map((phase) => (
              <Section
                key={phase}
                phase={phase}
                issues={dashboard[phase]}
                collapsed={collapsedSections[phase]}
                onToggle={() =>
                  setCollapsedSections((current) => ({
                    ...current,
                    [phase]: !current[phase],
                  }))
                }
                isConnected={!!account.username}
                loading={dashboardLoading}
                onSelectIssue={openIssue}
              />
            ))}

            {!hasAnyData && (
              <Footnote
                onSignUp={account.username ? null : () => setView("signup")}
                label={
                  dashboardError
                    ? dashboardError
                    : account.username
                      ? "analysis in progress"
                      : "analysis requires an account"
                }
              />
            )}
          </div>
        </main>
      </div>
    </AppShell>
  );
}
