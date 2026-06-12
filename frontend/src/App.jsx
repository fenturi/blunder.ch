import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
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
import modernBB from "./assets/second piece set/bB.svg";
import modernBK from "./assets/second piece set/bK.svg";
import modernBN from "./assets/second piece set/bN.svg";
import modernBP from "./assets/second piece set/bP.svg";
import modernBQ from "./assets/second piece set/bQ.svg";
import modernBR from "./assets/second piece set/bR.svg";
import modernWB from "./assets/second piece set/wB.svg";
import modernWK from "./assets/second piece set/wK.svg";
import modernWN from "./assets/second piece set/wN.svg";
import modernWP from "./assets/second piece set/wP.svg";
import modernWQ from "./assets/second piece set/wQ.svg";
import modernWR from "./assets/second piece set/wR.svg";
import moveIcon1 from "./assets/1.png";
import moveIcon3 from "./assets/3.png";
import moveIcon4 from "./assets/4.png";
import moveIcon5 from "./assets/5.png";
import moveIcon6 from "./assets/6.png";
import moveIcon7 from "./assets/7.png";
import brandIcon from "./assets/icon-green.png";
import DevPanel from "./components/DevPanel.jsx";
import SignupWizard from "./components/SignupWizard.jsx";
import { apiUrl } from "./lib/api.js";

const UI_SCALE = 1.1;
const ACCOUNT_STORAGE_KEY = "blunder.account";
const BOARD_THEME_STORAGE_KEY = "blunder.boardTheme";
const PIECE_SET_STORAGE_KEY = "blunder.pieceSet";
const DISCORD_INVITE_URL = "https://discord.gg/cgDt8EksRc";
const LANDING_NAVIGATION_EVENT = "blunder:navigate-landing";
const UPGRADE_NAVIGATION_EVENT = "blunder:navigate-upgrade";
const PROFILE_SETTINGS_NAVIGATION_EVENT = "blunder:navigate-profile-settings";
const ACCOUNT_UPDATED_EVENT = "blunder:account-updated";
const phases = ["Opening", "Middlegame", "Endgame"];
const moveClassifications = ["book", "only", "best", "good", "inaccuracy", "mistake", "blunder", "miss"];
const reviewClassifications = ["best", "good", "inaccuracy", "mistake", "blunder", "miss"];
const philosophyQuotes = [
  "The unexamined game is not worth replaying.",
  "Patience is the quiet half of calculation.",
  "Every mistake is a move asking to be understood.",
  "Clarity begins where hurry ends.",
];

const pieceSetPresets = [
  {
    id: "modern",
    label: "Modern",
    images: {
      K: modernWK,
      Q: modernWQ,
      R: modernWR,
      B: modernWB,
      N: modernWN,
      P: modernWP,
      k: modernBK,
      q: modernBQ,
      r: modernBR,
      b: modernBB,
      n: modernBN,
      p: modernBP,
    },
  },
  {
    id: "classic",
    label: "Classic",
    images: {
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
    },
  },
];

const avatarPresets = [
  { id: "white-knight", label: "White knight", image: modernWN },
  { id: "black-knight", label: "Black knight", image: modernBN },
  { id: "white-bishop", label: "White bishop", image: modernWB },
  { id: "black-bishop", label: "Black bishop", image: modernBB },
  { id: "white-rook", label: "White rook", image: modernWR },
  { id: "black-rook", label: "Black rook", image: modernBR },
];

const classificationIcons = {
  book: moveIcon7,
  only: moveIcon6,
  best: moveIcon1,
  good: moveIcon1,
  ok: moveIcon1,
  inaccuracy: moveIcon4,
  mistake: moveIcon5,
  blunder: moveIcon3,
  miss: moveIcon3,
};

const boardColorPresets = [
  {
    id: "default",
    label: "Blunder green",
    light: "#c8ebd4",
    dark: "#3d7754",
    board: "#09120d",
    border: "rgba(74,222,128,0.24)",
    coordinateLight: "rgba(7,8,8,0.5)",
    coordinateDark: "rgba(244,244,245,0.62)",
  },
  {
    id: "midnight",
    label: "Midnight",
    light: "#7f8288",
    dark: "#1f2329",
    board: "#0b0d10",
    border: "rgba(255,255,255,0.1)",
    coordinateLight: "rgba(0,0,0,0.52)",
    coordinateDark: "rgba(255,255,255,0.48)",
  },
  {
    id: "glass",
    label: "Glass",
    light: "rgba(255,255,255,0.28)",
    dark: "rgba(255,255,255,0.09)",
    board: "rgba(255,255,255,0.035)",
    border: "rgba(255,255,255,0.16)",
    squareShadow: "inset 0 0 0 1px rgba(255,255,255,0.035)",
    coordinateLight: "rgba(255,255,255,0.72)",
    coordinateDark: "rgba(255,255,255,0.5)",
  },
  {
    id: "purple",
    label: "Purple",
    light: "#c8bfe1",
    dark: "#51446c",
    board: "#141019",
    border: "rgba(200,191,225,0.2)",
    coordinateLight: "rgba(18,12,26,0.54)",
    coordinateDark: "rgba(255,255,255,0.62)",
  },
  {
    id: "tournament",
    label: "Tournament",
    light: "#e1d4bd",
    dark: "#8c6845",
    board: "#17110c",
    border: "rgba(225,212,189,0.18)",
    coordinateLight: "rgba(28,18,10,0.52)",
    coordinateDark: "rgba(255,255,255,0.58)",
  },
];

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
    avatarPreset: "white-knight",
    avatarDataUrl: "",
    profileSlug: "",
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

function boardThemeById(themeId) {
  return boardColorPresets.find((preset) => preset.id === themeId) || boardColorPresets[0];
}

function readStoredBoardTheme() {
  if (typeof window === "undefined") return boardColorPresets[0].id;

  const storedTheme = window.localStorage.getItem(BOARD_THEME_STORAGE_KEY);
  return boardThemeById(storedTheme).id;
}

function pieceSetById(pieceSetId) {
  return pieceSetPresets.find((preset) => preset.id === pieceSetId) || pieceSetPresets[0];
}

function readStoredPieceSet() {
  if (typeof window === "undefined") return pieceSetPresets[0].id;

  return pieceSetById(window.localStorage.getItem(PIECE_SET_STORAGE_KEY)).id;
}

function initialViewForAccount(account) {
  if (typeof window === "undefined") return account.username ? "dash" : "landing";

  if (window.location.pathname.startsWith("/profile/")) return "profile";
  if (window.location.pathname === "/profile-settings" && account.username) return "profile-settings";
  if (window.location.pathname.startsWith("/studies/") && account.username) return "study";
  if (window.location.pathname === "/analysis") return "sandbox";
  if (window.location.pathname === "/account") return "account";
  if (window.location.pathname === "/dev") return "dev";
  if (window.location.pathname === "/pro") return "upgrade";
  if (window.location.pathname === "/import" && account.username) return "import";
  if (window.location.pathname === "/settings" && account.username) return "settings";
  return window.location.pathname === "/dashboard" && account.username ? "dash" : "landing";
}

function initialStudyIdFromLocation() {
  if (typeof window === "undefined") return "";

  const match = window.location.pathname.match(/^\/studies\/([^/]+)/);
  return match?.[1] || "";
}

function profileFromLocation() {
  if (typeof window === "undefined") return null;

  const match = window.location.pathname.match(/^\/profile\/([^/]+)\/?$/);
  if (!match) return null;

  try {
    return { slug: decodeURIComponent(match[1]) };
  } catch {
    return null;
  }
}

function profilePath(profile) {
  const slug = profile?.profile_slug || profile?.profileSlug || profile?.slug || profile?.username;
  return slug ? `/profile/${encodeURIComponent(slug)}` : "/";
}

function pathForView(view, studyId = "", profile = null) {
  if (view === "study" && studyId) return `/studies/${studyId}`;
  if (view === "profile" && profile) return profilePath(profile);
  if (view === "profile-settings") return "/profile-settings";
  if (view === "sandbox") return "/analysis";
  if (view === "account") return "/account";
  if (view === "dev") return "/dev";
  if (view === "upgrade") return "/pro";
  if (view === "import") return "/import";
  if (view === "settings") return "/settings";

  return ["dash", "loading", "analysis"].includes(view)
    ? "/dashboard"
    : "/";
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
    avatarPreset: account.avatarPreset,
    avatarDataUrl: account.avatarDataUrl,
    profileSlug: account.profileSlug,
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

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const BROWSER_ANALYSIS_STORAGE_KEY = "blunder.browserAnalysis";
const CLASSIFICATION_MOVETIME_MS = 2000;

function fenParts(fen) {
  const [placement, turn = "w", castling = "-", enPassant = "-", halfmove = "0", fullmove = "1"] = String(fen || STARTING_FEN).trim().split(/\s+/);
  const board = parseFenBoard(placement || STARTING_FEN.split(" ")[0]);

  if (board.length !== 8 || board.some((row) => row.length !== 8)) {
    throw new Error("FEN board must contain 8 ranks and 8 files.");
  }

  if (!["w", "b"].includes(turn)) {
    throw new Error("FEN side to move must be w or b.");
  }

  return {
    board,
    turn,
    castling,
    enPassant,
    halfmove: Number.parseInt(halfmove, 10) || 0,
    fullmove: Number.parseInt(fullmove, 10) || 1,
  };
}

function boardToPlacement(board) {
  return board.map((row) => {
    let empty = 0;
    let output = "";

    for (const piece of row) {
      if (!piece) {
        empty += 1;
      } else {
        if (empty) output += String(empty);
        output += piece;
        empty = 0;
      }
    }

    return output + (empty ? String(empty) : "");
  }).join("/");
}

function stateToFen(state) {
  return [
    boardToPlacement(state.board),
    state.turn,
    state.castling || "-",
    state.enPassant || "-",
    String(state.halfmove ?? 0),
    String(state.fullmove ?? 1),
  ].join(" ");
}

function cloneBoard(board) {
  return board.map((row) => [...row]);
}

function pieceSide(piece) {
  if (!piece) return "";
  return piece === piece.toUpperCase() ? "w" : "b";
}

function oppositeSide(side) {
  return side === "w" ? "b" : "w";
}

function squareFromIndexes(row, column) {
  return row >= 0 && row <= 7 && column >= 0 && column <= 7 ? squareName(row, column) : "-";
}

function indexesFromSquare(square) {
  const indexes = squareIndexes(square);
  return indexes ? { row: indexes.row, column: indexes.column } : null;
}

function isPathClear(board, from, to) {
  const rowStep = Math.sign(to.row - from.row);
  const columnStep = Math.sign(to.column - from.column);
  let row = from.row + rowStep;
  let column = from.column + columnStep;

  while (row !== to.row || column !== to.column) {
    if (board[row]?.[column]) return false;
    row += rowStep;
    column += columnStep;
  }

  return true;
}

function isSquareAttacked(board, row, column, bySide) {
  const pawnDirection = bySide === "w" ? -1 : 1;
  for (const offset of [-1, 1]) {
    const pawn = board[row - pawnDirection]?.[column + offset];
    if (pawn && pieceSide(pawn) === bySide && pawn.toLowerCase() === "p") return true;
  }

  for (const [rowOffset, columnOffset] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) {
    const knight = board[row + rowOffset]?.[column + columnOffset];
    if (knight && pieceSide(knight) === bySide && knight.toLowerCase() === "n") return true;
  }

  const rays = [
    [-1, 0, "rq"],
    [1, 0, "rq"],
    [0, -1, "rq"],
    [0, 1, "rq"],
    [-1, -1, "bq"],
    [-1, 1, "bq"],
    [1, -1, "bq"],
    [1, 1, "bq"],
  ];

  for (const [rowStep, columnStep, attackers] of rays) {
    let cursorRow = row + rowStep;
    let cursorColumn = column + columnStep;

    while (cursorRow >= 0 && cursorRow <= 7 && cursorColumn >= 0 && cursorColumn <= 7) {
      const piece = board[cursorRow][cursorColumn];

      if (piece) {
        if (pieceSide(piece) === bySide && attackers.includes(piece.toLowerCase())) return true;
        break;
      }

      cursorRow += rowStep;
      cursorColumn += columnStep;
    }
  }

  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
      if (rowOffset === 0 && columnOffset === 0) continue;
      const king = board[row + rowOffset]?.[column + columnOffset];
      if (king && pieceSide(king) === bySide && king.toLowerCase() === "k") return true;
    }
  }

  return false;
}

function kingSquare(board, side) {
  const target = side === "w" ? "K" : "k";

  for (let row = 0; row < 8; row += 1) {
    for (let column = 0; column < 8; column += 1) {
      if (board[row][column] === target) return { row, column };
    }
  }

  return null;
}

function isKingInCheck(board, side) {
  const king = kingSquare(board, side);
  return king ? isSquareAttacked(board, king.row, king.column, oppositeSide(side)) : false;
}

function moveCastlingRights(castling, piece, from, capturedPiece, to) {
  let rights = castling === "-" ? "" : castling;
  const remove = (flag) => {
    rights = rights.replace(flag, "");
  };

  if (piece === "K") {
    remove("K");
    remove("Q");
  } else if (piece === "k") {
    remove("k");
    remove("q");
  }

  if (from === "h1" || to === "h1" || capturedPiece && to === "h1") remove("K");
  if (from === "a1" || to === "a1" || capturedPiece && to === "a1") remove("Q");
  if (from === "h8" || to === "h8" || capturedPiece && to === "h8") remove("k");
  if (from === "a8" || to === "a8" || capturedPiece && to === "a8") remove("q");

  return rights || "-";
}

function localMoveLabel({ piece, from, to, capturedPiece, enPassantCapture, castleSide, promotion, check }) {
  if (castleSide) return `${castleSide === "king" ? "O-O" : "O-O-O"}${check ? "+" : ""}`;

  const pieceName = piece.toLowerCase() === "p" ? "" : piece.toUpperCase();
  const capture = capturedPiece || enPassantCapture ? "x" : "";
  const pawnFile = !pieceName && capture ? from[0] : "";
  const promotionLabel = promotion ? `=${promotion.toUpperCase()}` : "";
  return `${pieceName}${pawnFile}${capture}${to}${promotionLabel}${check ? "+" : ""}`;
}

function buildLocalMove(fen, { from, to, promotion = "q" }) {
  const state = fenParts(fen);
  const fromIndexes = indexesFromSquare(from);
  const toIndexes = indexesFromSquare(to);

  if (!fromIndexes || !toIndexes || from === to) {
    throw new Error("Choose a source and target square.");
  }

  const piece = state.board[fromIndexes.row]?.[fromIndexes.column] || "";
  const capturedPiece = state.board[toIndexes.row]?.[toIndexes.column] || "";
  const side = pieceSide(piece);

  if (!piece) throw new Error("There is no piece on that square.");
  if (side !== state.turn) throw new Error(`${state.turn === "w" ? "White" : "Black"} to move.`);
  if (capturedPiece && pieceSide(capturedPiece) === side) throw new Error("That square is occupied by your own piece.");

  const pieceKind = piece.toLowerCase();
  const rowDelta = toIndexes.row - fromIndexes.row;
  const columnDelta = toIndexes.column - fromIndexes.column;
  const absRow = Math.abs(rowDelta);
  const absColumn = Math.abs(columnDelta);
  const direction = side === "w" ? -1 : 1;
  let enPassantCapture = "";
  let castleSide = "";

  if (pieceKind === "p") {
    const startRow = side === "w" ? 6 : 1;
    const oneForward = columnDelta === 0 && rowDelta === direction && !capturedPiece;
    const twoForward = columnDelta === 0
      && fromIndexes.row === startRow
      && rowDelta === direction * 2
      && !capturedPiece
      && !state.board[fromIndexes.row + direction][fromIndexes.column];
    const diagonalCapture = absColumn === 1 && rowDelta === direction && capturedPiece && pieceSide(capturedPiece) !== side;
    const enPassant = absColumn === 1 && rowDelta === direction && state.enPassant === to && !capturedPiece;

    if (!oneForward && !twoForward && !diagonalCapture && !enPassant) {
      throw new Error("That pawn move is not legal.");
    }

    if (enPassant) {
      enPassantCapture = state.board[fromIndexes.row][toIndexes.column] || "";
    }
  } else if (pieceKind === "n") {
    if (!((absRow === 2 && absColumn === 1) || (absRow === 1 && absColumn === 2))) {
      throw new Error("That knight move is not legal.");
    }
  } else if (pieceKind === "b") {
    if (absRow !== absColumn || !isPathClear(state.board, fromIndexes, toIndexes)) {
      throw new Error("That bishop move is not legal.");
    }
  } else if (pieceKind === "r") {
    if ((rowDelta !== 0 && columnDelta !== 0) || !isPathClear(state.board, fromIndexes, toIndexes)) {
      throw new Error("That rook move is not legal.");
    }
  } else if (pieceKind === "q") {
    if (!((absRow === absColumn || rowDelta === 0 || columnDelta === 0) && isPathClear(state.board, fromIndexes, toIndexes))) {
      throw new Error("That queen move is not legal.");
    }
  } else if (pieceKind === "k") {
    const castlingAttempt = rowDelta === 0 && absColumn === 2;

    if (castlingAttempt) {
      const isKingSide = columnDelta > 0;
      const right = side === "w" ? (isKingSide ? "K" : "Q") : (isKingSide ? "k" : "q");
      const homeRow = side === "w" ? 7 : 0;
      const emptyColumns = isKingSide ? [5, 6] : [1, 2, 3];
      const passColumns = isKingSide ? [4, 5, 6] : [4, 3, 2];

      if (fromIndexes.row !== homeRow || fromIndexes.column !== 4 || !state.castling.includes(right)) {
        throw new Error("Castling is not available.");
      }

      if (emptyColumns.some((column) => state.board[homeRow][column])) {
        throw new Error("Castling path is blocked.");
      }

      if (passColumns.some((column) => isSquareAttacked(state.board, homeRow, column, oppositeSide(side)))) {
        throw new Error("Castling through check is not legal.");
      }

      castleSide = isKingSide ? "king" : "queen";
    } else if (Math.max(absRow, absColumn) !== 1) {
      throw new Error("That king move is not legal.");
    }
  }

  const nextBoard = cloneBoard(state.board);
  nextBoard[fromIndexes.row][fromIndexes.column] = "";
  let placedPiece = piece;
  const promotionRank = side === "w" ? 0 : 7;
  const isPromotion = pieceKind === "p" && toIndexes.row === promotionRank;

  if (isPromotion) {
    placedPiece = side === "w" ? promotion.toUpperCase() : promotion.toLowerCase();
  }

  if (enPassantCapture) {
    nextBoard[fromIndexes.row][toIndexes.column] = "";
  }

  nextBoard[toIndexes.row][toIndexes.column] = placedPiece;

  if (castleSide) {
    const row = side === "w" ? 7 : 0;
    if (castleSide === "king") {
      nextBoard[row][7] = "";
      nextBoard[row][5] = side === "w" ? "R" : "r";
    } else {
      nextBoard[row][0] = "";
      nextBoard[row][3] = side === "w" ? "R" : "r";
    }
  }

  if (isKingInCheck(nextBoard, side)) {
    throw new Error("That move leaves your king in check.");
  }

  const nextTurn = oppositeSide(side);
  const nextState = {
    board: nextBoard,
    turn: nextTurn,
    castling: moveCastlingRights(state.castling, piece, from, capturedPiece || enPassantCapture, to),
    enPassant: pieceKind === "p" && Math.abs(rowDelta) === 2
      ? squareFromIndexes(fromIndexes.row + direction, fromIndexes.column)
      : "-",
    halfmove: pieceKind === "p" || capturedPiece || enPassantCapture ? 0 : state.halfmove + 1,
    fullmove: side === "b" ? state.fullmove + 1 : state.fullmove,
  };
  const check = isKingInCheck(nextBoard, nextTurn);
  const san = localMoveLabel({
    piece: pieceKind === "p" ? "p" : pieceKind.toUpperCase(),
    from,
    to,
    capturedPiece,
    enPassantCapture,
    castleSide,
    promotion: isPromotion ? promotion : "",
    check,
  });

  return {
    from,
    to,
    uci: `${from}${to}${isPromotion ? promotion : ""}`,
    san,
    fenBefore: stateToFen(state),
    fenAfter: stateToFen(nextState),
    evaluationAfter: 0,
  };
}

function readBrowserAnalysisSession() {
  if (typeof window === "undefined") {
    return {
      rootFen: STARTING_FEN,
      fen: STARTING_FEN,
      moves: [],
    };
  }

  try {
    const stored = JSON.parse(window.localStorage.getItem(BROWSER_ANALYSIS_STORAGE_KEY) || "{}");
    const rootFen = stored.rootFen || STARTING_FEN;
    const fen = stored.fen || rootFen;

    fenParts(rootFen);
    fenParts(fen);

    return {
      rootFen,
      fen,
      moves: Array.isArray(stored.moves) ? stored.moves : [],
    };
  } catch {
    return {
      rootFen: STARTING_FEN,
      fen: STARTING_FEN,
      moves: [],
    };
  }
}

function fenTurn(fen) {
  return String(fen || "").trim().split(/\s+/)[1] === "b" ? "b" : "w";
}

function playerEvaluationFromWhite(whiteEvaluation, side) {
  return side === "w" ? whiteEvaluation : -whiteEvaluation;
}

function cloudLineEvaluation(line) {
  if (!line) return 0;
  if (line.mate !== null && line.mate !== undefined) {
    return line.mate > 0 ? 9000 : -9000;
  }

  return Number(line.evaluation || 0);
}

function classifyCpLoss(cpLoss) {
  if (cpLoss < 20) return "best";
  if (cpLoss < 50) return "good";
  if (cpLoss < 100) return "inaccuracy";
  if (cpLoss < 450) return "mistake";
  if (cpLoss < 900) return "blunder";
  return "miss";
}

function isClassificationPending(annotationOrMove) {
  return annotationOrMove?.classificationStatus === "classifying";
}

function ClassificationSpinner({ size = "22px" }) {
  return (
    <span
      className="classification-spinner"
      aria-label="classification pending"
      style={sx({
        display: "inline-block",
        width: size,
        height: size,
        verticalAlign: "middle",
      })}
    />
  );
}

async function readJsonResponse(response) {
  const text = await response.text();

  if (!text.trim()) {
    return response.ok ? {} : { error: `Request failed with status ${response.status}` };
  }

  try {
    return JSON.parse(text);
  } catch {
    return response.ok
      ? {}
      : { error: `Request returned an invalid response (${response.status})` };
  }
}

async function evaluateFenWithCloudStockfish(fen) {
  const params = new URLSearchParams({
    fen,
    limit: "1",
    movetime: String(CLASSIFICATION_MOVETIME_MS),
  });
  const response = await fetch(apiUrl(`/api/analysis/lines?${params.toString()}`));
  const payload = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(payload.error || "unable to evaluate position");
  }

  return payload.lines?.[0] || { evaluation: 0, mate: null, depth: 0, pv: [] };
}

async function getOpeningBookClassification({ fen, playedUci, moveNumber }) {
  if (!fen || !playedUci || moveNumber > 12) return null;

  try {
    const params = new URLSearchParams({
      fen,
      source: "lichess",
      limit: "1",
      moves: "12",
    });
    const response = await fetch(apiUrl(`/api/openings/explorer?${params.toString()}`));
    const payload = await readJsonResponse(response).catch(() => null);

    if (!response.ok || !payload) return null;

    const bookMoves = (payload.moves || []).filter((move) => move.uci);
    const matchingMove = bookMoves.find((move) => (
      move.uci.toLowerCase() === String(playedUci || "").toLowerCase()
    ));

    if (!matchingMove) return null;

    return {
      classification: bookMoves.length === 1 ? "only" : "book",
      cpLoss: 0,
      evaluationBefore: 0,
      evaluationAfter: 0,
      depth: 0,
      bookMove: matchingMove,
      classifiedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

async function classifyMoveWithCloudStockfish(move) {
  const [before, after] = await Promise.all([
    evaluateFenWithCloudStockfish(move.fenBefore),
    evaluateFenWithCloudStockfish(move.fenAfter),
  ]);
  const side = fenTurn(move.fenBefore);
  const evaluationBefore = cloudLineEvaluation(before);
  const evaluationAfter = cloudLineEvaluation(after);
  const playerEvaluationBefore = playerEvaluationFromWhite(evaluationBefore, side);
  const playerEvaluationAfter = playerEvaluationFromWhite(evaluationAfter, side);
  const cpLoss = Math.max(0, playerEvaluationBefore - playerEvaluationAfter);

  return {
    classification: classifyCpLoss(cpLoss),
    cpLoss,
    evaluationBefore,
    evaluationAfter,
    depth: Math.min(before.depth || 0, after.depth || 0),
    classifiedAt: new Date().toISOString(),
  };
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

function variationPly(basePly, index) {
  return Number(basePly || 0) + index + 1;
}

function variationMovePrefix(basePly, index) {
  const ply = variationPly(basePly, index);
  const moveNumber = Math.ceil(ply / 2);
  return ply % 2 === 1 ? `${moveNumber}.` : `${moveNumber}...`;
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
    classification: move.classification || "analysis",
    classificationStatus: move.classificationStatus || "",
    evaluation_before: move.evaluationBefore ?? 0,
    evaluation_after: move.evaluation_after ?? move.evaluationAfter ?? 0,
    evaluation_loss: move.cpLoss ?? 0,
    cp_loss: move.cpLoss ?? 0,
    game_phase: "analysis",
  };
}

function analysisMoveId(prefix = "move") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function variationParentKeyForMainline(ply) {
  return `mainline:${Number(ply || 0)}`;
}

function variationParentKeyForMove(moveId) {
  return `variation:${moveId}`;
}

function annotationUci(annotation) {
  return String(
    annotation?.uci
    || `${annotation?.from_square || annotation?.from || ""}${annotation?.to_square || annotation?.to || ""}`
  ).toLowerCase();
}

function findVariationLine(lines, lineId) {
  return lines.find((line) => line.id === lineId) || null;
}

function childVariationLines(lines, parentKey) {
  return lines.filter((line) => line.parentKey === parentKey);
}

function updateVariationMove(lines, lineId, moveIndex, updater) {
  return lines.map((line) => (
    line.id === lineId
      ? {
        ...line,
        moves: line.moves.map((move, index) => (index === moveIndex ? updater(move) : move)),
      }
      : line
  ));
}

function removeVariationLineTree(lines, lineId) {
  const root = findVariationLine(lines, lineId);
  if (!root) return lines;

  const removedMoveIds = new Set(root.moves.map((move) => move.id));
  let changed = true;

  while (changed) {
    changed = false;
    for (const line of lines) {
      if (removedMoveIds.has(line.parentKey.replace("variation:", ""))) {
        for (const move of line.moves) {
          if (!removedMoveIds.has(move.id)) {
            removedMoveIds.add(move.id);
            changed = true;
          }
        }
      }
    }
  }

  return lines.filter((line) => (
    line.id !== lineId
    && !removedMoveIds.has(line.parentKey.replace("variation:", ""))
  ));
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

    return {
      label,
      section: "move contrast",
      annotation: worst,
      boardFocus: boardFocusFromAnnotation(worst),
      classification,
      metric: `${classificationLabel} | -${formatCpLoss(worst)} pawns`,
      contrast: {
        played: moveLabel,
        loss: formatCpLoss(worst),
      },
      text: `${phaseTitle(stat.phase)} was the phase that actually cost you. You played ${moveLabel}, a ${classificationLabel.toLowerCase()} worth ${formatCpLoss(worst)} pawns. ${phaseAdvice[stat.phase]}`,
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
  showMoveBadge = true,
  showCoordinates = true,
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
  const boardTheme = boardThemeById(readStoredBoardTheme());
  const pieceImages = pieceSetById(readStoredPieceSet()).images;
  const isPendingClassification = isClassificationPending(annotation);
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
        border: `1px solid ${boardTheme.border}`,
        background: boardTheme.board,
        backdropFilter: boardTheme.id === "glass" ? "blur(18px)" : "none",
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
                background: isLight ? boardTheme.light : boardTheme.dark,
                boxShadow: boardTheme.squareShadow || "none",
                minWidth: 0,
                minHeight: 0,
                aspectRatio: "1 / 1",
                userSelect: "none",
              })}
            >
              {showCoordinates && columnIndex === 0 ? (
                <span
                  style={sx({
                    position: "absolute",
                    top: "8px",
                    left: "8px",
                    fontSize: "11px",
                    color: isLight ? boardTheme.coordinateLight : boardTheme.coordinateDark,
                    letterSpacing: ".08em",
                  })}
                >
                  {ranks[rowIndex]}
                </span>
              ) : null}

              {showCoordinates && rowIndex === 7 ? (
                <span
                  style={sx({
                    position: "absolute",
                    right: "8px",
                    bottom: "8px",
                    fontSize: "11px",
                    color: isLight ? boardTheme.coordinateLight : boardTheme.coordinateDark,
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
      {showMoveBadge && badgeSquare ? (
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
          {isPendingClassification ? (
            <div
              style={sx({
                position: "absolute",
                width: "32%",
                height: "32%",
                right: "6%",
                top: "6%",
              })}
              title="Classifying"
            >
              <ClassificationSpinner size="100%" />
            </div>
          ) : badgeIcon ? (
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

function MoveClassificationBadge({ annotation }) {
  if (!annotation) return null;

  const isPending = isClassificationPending(annotation);
  const classification = visualClassification(annotation);
  const symbol = classificationSymbol(classification);

  if (isPending) {
    return <ClassificationSpinner size="12px" />;
  }

  if (!symbol && ["good", "ok"].includes(classification)) return null;

  return (
    <span className={`move-classification-badge is-${classification}`} title={formatClassification(classification)}>
      {symbol || classification.slice(0, 4)}
    </span>
  );
}

function MoveEvalPill({ annotation }) {
  const cpLoss = rawCpLoss(annotation);
  const classification = visualClassification(annotation);

  if (!Number.isFinite(cpLoss) || cpLoss < 20 || ["book", "best", "good", "ok"].includes(classification)) return null;

  return (
    <span className="move-eval-loss">
      -{(cpLoss / 100).toFixed(2)}
    </span>
  );
}

function MoveListCell({
  annotation,
  activePly,
  isVariationActive = false,
  onSelectPly,
  onSelectVariationMove,
}) {
  if (!annotation) {
    return <span className="move-cell-placeholder" />;
  }

  const isActive = isVariationActive || annotation.ply === activePly;
  const displayClassification = visualClassification(annotation);
  const classificationTitle = formatClassification(displayClassification);

  return (
    <button
      type="button"
      className={`analysis-move-cell${isActive ? " is-active" : ""} is-${displayClassification}`}
      onClick={() => (
        onSelectVariationMove
          ? onSelectVariationMove()
          : onSelectPly?.(annotation.ply)
      )}
      title={`${annotation.san}: ${classificationTitle}`}
    >
      <span className="analysis-move-san">{annotation.san}</span>
      <span className="analysis-move-meta">
        <MoveEvalPill annotation={annotation} />
        <MoveClassificationBadge annotation={annotation} />
      </span>
    </button>
  );
}

function AccuracyCard({ color, player, summary, isUser }) {
  return (
    <div
      className="accuracy-card"
      style={sx({
        display: "grid",
        gap: "12px",
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
        <VisualDonut
          value={summary.accuracy}
          total={100}
          label="accuracy"
          size="78px"
          color={color === "white" ? "rgba(255,255,255,0.86)" : "rgba(255,255,255,0.58)"}
        />
      </div>

      <div
        className="classification-count-grid"
        style={sx({
          display: "grid",
          gridTemplateColumns: "repeat(8, minmax(0, 1fr))",
          gap: "5px",
        })}
      >
        {reviewClassifications.map((classification) => (
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

// Kept for a future details surface; no longer mounted in the analysis layout.
// eslint-disable-next-line no-unused-vars
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
            <div style={sx({ fontSize: "11px", color: "rgba(255,255,255,0.34)", letterSpacing: ".06em", textTransform: "uppercase" })}>
              swing {note.contrast.loss} pawns
            </div>
          </div>
        ) : null}
        <div
          style={sx({
            fontSize: "16px",
            lineHeight: 1.5,
            color: note.classification ? "rgba(255,255,255,0.78)" : "rgba(255,255,255,0.66)",
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
      className="rail-metric"
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
        background: "#232323",
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
          background: "#2b2b2b",
          transition: "height 360ms cubic-bezier(.2,.8,.2,1)",
        })}
      />
      <div
        style={sx({
          height: `${whitePercent}%`,
          minHeight: "4%",
          background: "#eeeeee",
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
  onPreviewLine,
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
      onEvaluationChangeRef.current?.(null, fen);
      return undefined;
    }

    const controller = new AbortController();
    onEvaluationChangeRef.current?.(null, fen);
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
        onEvaluationChangeRef.current?.(payload.lines?.[0]?.evaluation ?? null, fen);
      })
      .catch((error) => {
        if (error.name === "AbortError") return;
        setState({ status: "error", depth: 0, lines: [], error: error.message || "unable to evaluate position" });
        onEvaluationChangeRef.current?.(null, fen);
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
      className="stockfish-panel"
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
            {isApplyingVariation ? "playing move" : panelState.status === "loading" ? "calculating" : panelState.depth ? `Depth ${panelState.depth} · ${settings.lineCount} lines` : "live"}
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
        <div style={sx({ color: "rgba(255,255,255,0.62)", fontSize: "12px", padding: "5px 2px" })}>
          {panelState.error}
        </div>
      ) : (
        <div style={sx({ display: "grid" })}>
          {rows.map((line) => (
            <div
              className="stockfish-line"
              key={line.placeholder ? `loading-${line.multipv}` : line.multipv}
              style={sx({
                display: "grid",
                gridTemplateColumns: "22px 52px minmax(0, 1fr)",
                alignItems: "center",
                gap: "8px",
                minHeight: "30px",
                padding: "5px 0",
                borderBottom: "1px solid rgba(255,255,255,0.035)",
              })}
            >
              <span className="stockfish-line-number">
                {line.multipv || "·"}
              </span>
              <span
                className="stockfish-eval-pill"
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
                  className="stockfish-moves"
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
                      onClick={() => (onPreviewLine ? onPreviewLine(line, moveIndex) : onPlayLineMove?.(line, moveIndex))}
                      onDoubleClick={() => onPlayLineMove?.(line, moveIndex)}
                      title={onPreviewLine ? `Preview ${moveSan}; double-click to add the line` : `Play through ${moveSan}`}
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

// eslint-disable-next-line no-unused-vars
function AnalysisOverviewPanel({ game, account }) {
  const whiteSummary = buildSideSummary(game, "white");
  const blackSummary = buildSideSummary(game, "black");
  const userColor = playerColorForGame(game, account?.username);

  return (
    <div className="analysis-overview" style={sx({ display: "grid", gap: "18px" })}>
      <div style={sx({ fontSize: "16px", color: "#fff", lineHeight: 1.15 })}>
        Accuracy
      </div>
      <AccuracyCard color="white" player={game.white_player} summary={whiteSummary} isUser={userColor === "white"} />
      <AccuracyCard color="black" player={game.black_player} summary={blackSummary} isUser={userColor === "black"} />
    </div>
  );
}

function VariationLine({
  line,
  allLines,
  activeCursor,
  collapsedLineIds,
  onToggle,
  onSelectMove,
  onDelete,
  onCopy,
  depth = 0,
}) {
  const isCollapsed = collapsedLineIds.has(line.id);

  return (
    <div className="variation-line" style={sx({ "--variation-depth": depth })}>
      <div className="variation-line-header">
        <button type="button" className="variation-toggle" onClick={() => onToggle(line.id)} aria-label={isCollapsed ? "Expand variation" : "Collapse variation"}>
          {isCollapsed ? "+" : "-"}
        </button>
        <span>{line.moves.length} move{line.moves.length === 1 ? "" : "s"}</span>
        <span className="variation-line-actions">
          <button type="button" onClick={() => onCopy(line)}>copy</button>
          <button type="button" onClick={() => onDelete(line.id)}>delete</button>
        </span>
      </div>
      {!isCollapsed ? (
        <div className="variation-moves">
          {line.moves.map((move, moveIndex) => {
            const annotation = variationAnnotationFromMove(move, line.basePly, moveIndex);
            const childLines = childVariationLines(allLines, variationParentKeyForMove(move.id));
            const isActive = activeCursor?.lineId === line.id && activeCursor?.moveIndex === moveIndex;

            return (
              <Fragment key={move.id}>
                <MoveListCell
                  annotation={annotation}
                  activePly={-1}
                  isVariationActive={isActive}
                  onSelectVariationMove={() => onSelectMove(line.id, moveIndex)}
                />
                {childLines.map((childLine) => (
                  <VariationLine
                    key={childLine.id}
                    line={childLine}
                    allLines={allLines}
                    activeCursor={activeCursor}
                    collapsedLineIds={collapsedLineIds}
                    onToggle={onToggle}
                    onSelectMove={onSelectMove}
                    onDelete={onDelete}
                    onCopy={onCopy}
                    depth={depth + 1}
                  />
                ))}
              </Fragment>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function AnalysisMovesPanel({
  currentAnnotation,
  fen,
  moveRows,
  variationLines = [],
  activeVariationCursor,
  variationStatus = "idle",
  variationError = "",
  onSelectPly,
  onSelectVariationMove,
  onPreviewLine,
  onPlayLineMove,
  onDeleteVariationLine,
  onEvaluationChange,
}) {
  const [collapsedLineIds, setCollapsedLineIds] = useState(() => new Set());

  function toggleVariation(lineId) {
    setCollapsedLineIds((current) => {
      const next = new Set(current);
      if (next.has(lineId)) next.delete(lineId);
      else next.add(lineId);
      return next;
    });
  }

  function copyVariation(line) {
    const text = formatVariationLine(line.moves, line.basePly);
    navigator.clipboard?.writeText(text).catch(() => {});
  }

  return (
    <div className="analysis-moves-panel">
      <StockfishLinesPanel
        fen={fen}
        onPreviewLine={onPreviewLine}
        onPlayLineMove={onPlayLineMove}
        onEvaluationChange={onEvaluationChange}
        isApplyingVariation={variationStatus === "loading"}
      />

      {variationError ? <div className="analysis-variation-error">{variationError}</div> : null}

      <div className="move-list-heading">
        <span>Move list</span>
        <span>{moveRows.length} moves</span>
      </div>

      <div className="analysis-move-list">
        <div className="move-list-columns">
          <span>Move</span>
          <span>White</span>
          <span>Black</span>
        </div>
        {moveRows.map((row) => {
          const rowAnnotations = [row.white, row.black].filter(Boolean);
          const anchoredLines = rowAnnotations.flatMap((annotation) => (
            childVariationLines(variationLines, variationParentKeyForMainline(annotation.ply))
          ));

          return (
            <Fragment key={row.moveIndex}>
              <div className="analysis-move-row">
                <span className="analysis-move-number">{row.moveIndex}.</span>
                <MoveListCell annotation={row.white} activePly={currentAnnotation.ply} onSelectPly={onSelectPly} />
                <MoveListCell annotation={row.black} activePly={currentAnnotation.ply} onSelectPly={onSelectPly} />
              </div>
              {anchoredLines.map((line) => (
                <VariationLine
                  key={line.id}
                  line={line}
                  allLines={variationLines}
                  activeCursor={activeVariationCursor}
                  collapsedLineIds={collapsedLineIds}
                  onToggle={toggleVariation}
                  onSelectMove={onSelectVariationMove}
                  onDelete={onDeleteVariationLine}
                  onCopy={copyVariation}
                />
              ))}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  app: sx({
    background: "#080808",
    minHeight: "100vh",
    width: "100%",
    padding: "clamp(22px, 4vw, 56px)",
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    fontWeight: 200,
    color: "#fff",
    boxSizing: "border-box",
  }),
  header: sx({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "clamp(38px, 6vw, 72px)",
    gap: "24px",
    flexWrap: "wrap",
  }),
  logo: sx({
    fontSize: "clamp(30px, 5vw, 44px)",
    fontWeight: 300,
    letterSpacing: ".08em",
  }),
  sections: sx({
    display: "flex",
    flexDirection: "column",
    gap: "clamp(34px, 6vw, 64px)",
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

function VisualDonut({
  value,
  total,
  label,
  detail,
  size = "92px",
  color = "rgba(255,255,255,0.72)",
}) {
  const safeTotal = Math.max(1, Number(total) || 0);
  const safeValue = Math.max(0, Math.min(safeTotal, Number(value) || 0));
  const percent = Math.round((safeValue / safeTotal) * 100);

  return (
    <div
      className="visual-donut"
      style={sx({
        "--donut-size": size,
        "--donut-percent": `${percent}%`,
        "--donut-color": color,
      })}
      aria-label={`${label} ${percent}%`}
      title={`${label} ${percent}%`}
    >
      <span className="visual-donut-value">{percent}%</span>
      <span className="visual-donut-label">{label}</span>
      {detail ? <span className="visual-donut-detail">{detail}</span> : null}
    </div>
  );
}

function BoardThemeSwatch({ preset }) {
  return (
    <span
      className="board-theme-swatch"
      style={sx({
        background: preset.board,
        borderColor: preset.border,
        backdropFilter: preset.id === "glass" ? "blur(10px)" : "none",
      })}
      aria-hidden="true"
    >
      {Array.from({ length: 16 }).map((_, index) => {
        const row = Math.floor(index / 4);
        const column = index % 4;
        const isLight = (row + column) % 2 === 0;

        return (
          <span
            key={index}
            style={sx({
              background: isLight ? preset.light : preset.dark,
              boxShadow: preset.squareShadow || "none",
            })}
          />
        );
      })}
    </span>
  );
}

function DashboardSettings({
  boardThemeId,
  onBoardThemeChange,
  pieceSetId,
  onPieceSetChange,
}) {
  return (
    <section className="dashboard-settings">
      <div className="dashboard-settings-header">
        <span>settings</span>
        <span>board</span>
      </div>

      <div className="dashboard-settings-grid">
        {boardColorPresets.map((preset) => {
          const isActive = preset.id === boardThemeId;

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onBoardThemeChange(preset.id)}
              className={isActive ? "board-theme-option is-active" : "board-theme-option"}
              aria-pressed={isActive}
            >
              <BoardThemeSwatch preset={preset} />
              <span>{preset.label}</span>
            </button>
          );
        })}
      </div>

      <div className="piece-set-settings">
        <div className="dashboard-settings-header">
          <span>pieces</span>
          <span>set</span>
        </div>
        <div className="piece-set-grid">
          {pieceSetPresets.map((preset) => {
            const isActive = preset.id === pieceSetId;

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onPieceSetChange(preset.id)}
                className={isActive ? "piece-set-option is-active" : "piece-set-option"}
                aria-pressed={isActive}
              >
                <span className="piece-set-preview">
                  <img src={preset.images.N} alt="" draggable="false" />
                  <img src={preset.images.n} alt="" draggable="false" />
                </span>
                <span>{preset.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function avatarSource(profile) {
  if (profile?.avatar_data_url || profile?.avatarDataUrl) {
    return profile.avatar_data_url || profile.avatarDataUrl;
  }

  const presetId = profile?.avatar_preset || profile?.avatarPreset || "white-knight";
  return avatarPresets.find((preset) => preset.id === presetId)?.image || avatarPresets[0].image;
}

function ProfileAvatar({ profile, size = "96px" }) {
  return (
    <span className="profile-avatar" style={{ width: size, height: size }}>
      <img src={avatarSource(profile)} alt="" draggable="false" />
    </span>
  );
}

function LogoMark() {
  return (
    <span className="brand-mark" style={sx({ display: "inline-flex", alignItems: "center", gap: "10px" })}>
      <img className="brand-favicon" src={brandIcon} alt="" aria-hidden="true" />
      <span className="brand-name">blunder.ch</span>
      <span className="brand-beta">beta</span>
    </span>
  );
}

function LandingProAction({ isPremium, onAccount, onUpgrade }) {
  return (
    <motion.button
      type="button"
      className={`landing-pro-action${isPremium ? " is-active" : ""}`}
      onClick={isPremium ? onAccount : onUpgrade}
      aria-label={isPremium ? "Open Pro account" : "Activate Pro"}
      whileTap={{ scale: 0.94 }}
    >
      <span className="landing-pro-action-dot" aria-hidden="true" />
      <span>{isPremium ? "Pro" : "Activate Pro"}</span>
    </motion.button>
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
  const boardTheme = boardThemeById(readStoredBoardTheme());
  const pieceImages = pieceSetById(readStoredPieceSet()).images;

  return (
    <div
      style={sx({
        aspectRatio: "1 / 1",
        display: "grid",
        gridTemplateColumns: "repeat(8, 1fr)",
        gridTemplateRows: "repeat(8, 1fr)",
        overflow: "hidden",
        border: `1px solid ${boardTheme.border}`,
        background: boardTheme.board,
        backdropFilter: boardTheme.id === "glass" ? "blur(12px)" : "none",
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
                background: isLight ? boardTheme.light : boardTheme.dark,
                boxShadow: boardTheme.squareShadow || "none",
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

function IssueRow({ issue, phase, onSelect }) {
  return (
    <button
      type="button"
      className="issue-card"
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
      <span className="issue-phase-badge">{phase}</span>
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
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: "6px 10px",
          fontSize: "10px",
          letterSpacing: ".08em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.28)",
        })}
      >
        <span>{issue.result || "--"}</span>
        <span>{issue.moves} moves</span>
        <span style={sx({ textAlign: "right" })}>{formatPlayedDate(issue.playedAt)}</span>
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
    <section className="phase-section">
      <button
        type="button"
        onClick={onToggle}
        className="phase-section-header"
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
        <span className="phase-title-wrap">
          <span style={styles.phaseLabel}>{phase}</span>
          <span className="phase-description">
            {phase === "Opening"
              ? "Preparation, development, and early tactical decisions."
              : phase === "Middlegame"
                ? "Tactical swings, plans, and piece coordination."
                : "Conversions, king activity, and pawn-race decisions."}
          </span>
        </span>
        <span className="phase-count" style={styles.helperText}>{helperLabel}</span>
        <span style={sx({ ...styles.helperText, marginLeft: "auto", letterSpacing: ".12em" })}>
          {collapsed ? "expand" : "hide"}
        </span>
      </button>

      {!collapsed && (
        <div
          className={hasData ? "phase-issue-grid" : undefined}
          style={hasData ? sx({
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            gap: "14px",
          }) : undefined}
        >
          {hasData
            ? issues.map((issue, index) => (
              <IssueRow key={issue.id} issue={issue} phase={phase} index={index} onSelect={onSelectIssue} />
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
    </section>
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
  headerActions = null,
}) {
  const copyrightYear = new Date().getFullYear();
  const [shellAccount, setShellAccount] = useState(readStoredAccount);
  const showUpgradeAction = !!shellAccount.username && !shellAccount.isPremium && view !== "upgrade";
  useEffect(() => {
    const handleAccountUpdate = () => setShellAccount(readStoredAccount());
    window.addEventListener(ACCOUNT_UPDATED_EVENT, handleAccountUpdate);
    return () => window.removeEventListener(ACCOUNT_UPDATED_EVENT, handleAccountUpdate);
  }, []);
  function handleLogoClick() {
    if (typeof window === "undefined") {
      onHome?.();
      return;
    }

    window.dispatchEvent(new CustomEvent(LANDING_NAVIGATION_EVENT));
  }
  function handleUpgradeClick() {
    if (typeof window === "undefined") return;

    window.dispatchEvent(new CustomEvent(UPGRADE_NAVIGATION_EVENT));
  }
  function handleProfileClick() {
    if (typeof window === "undefined") return;

    window.dispatchEvent(new CustomEvent(PROFILE_SETTINGS_NAVIGATION_EVENT));
  }

  return (
    <div className={`app-shell app-shell-${view}`} style={styles.app}>
      <div className="app-shell-header" style={styles.header}>
        <button
          type="button"
          onClick={handleLogoClick}
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
        <div className="app-shell-actions" style={sx({ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", justifyContent: "flex-end" })}>
          {showUpgradeAction && !headerActions ? (
            <button
              type="button"
              onClick={handleUpgradeClick}
              style={sx({
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.025)",
                color: "rgba(255,255,255,0.42)",
                minHeight: "32px",
                padding: "7px 10px",
                borderRadius: "6px",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: "11px",
                letterSpacing: ".1em",
                textTransform: "uppercase",
              })}
            >
              activate pro
            </button>
          ) : null}
          {view === "signup" || view === "login" ? (
            <Nav
              view={view}
              onBack={onBack}
            />
          ) : null}
          {headerActions}
          {shellAccount.username && view !== "profile-settings" && view !== "landing" ? (
            <button
              type="button"
              className="header-profile-button"
              onClick={handleProfileClick}
              title={`${shellAccount.username} profile`}
              aria-label="Open profile settings"
            >
              <img src={avatarSource(shellAccount)} alt="" draggable="false" />
            </button>
          ) : null}
        </div>
      </div>

      {children}

      {view === "signup" || view === "login" ? null : (
        <footer
          className="app-shell-footer"
          style={sx({
            marginTop: "76px",
            paddingTop: "18px",
            borderTop: "1px solid rgba(255,255,255,0.045)",
            display: "flex",
            justifyContent: "space-between",
            gap: "18px",
            flexWrap: "wrap",
            color: "rgba(255,255,255,0.24)",
            fontSize: "11px",
            letterSpacing: ".12em",
            textTransform: "uppercase",
          })}
        >
          <span>Copyright {copyrightYear} blunder.ch. All rights reserved.</span>
          <span
            style={sx({
              display: "flex",
              gap: "18px",
              flexWrap: "wrap",
            })}
          >
            <a
              href={DISCORD_INVITE_URL}
              target="_blank"
              rel="noreferrer"
              style={sx({
                color: "rgba(255,255,255,0.34)",
                textDecoration: "none",
                borderBottom: "1px solid rgba(255,255,255,0.12)",
              })}
            >
              join discord
            </a>
            <span>Proprietary software. Unauthorized copying prohibited.</span>
          </span>
        </footer>
      )}

      {import.meta.env.DEV ? <DevPanel /> : null}
    </div>
  );
}

function RailMetric({ label, value }) {
  return (
    <div
      className="rail-metric"
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

function RailAction({ children, onClick, emphasis = false, bright = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rail-action${emphasis ? " is-emphasis" : ""}${bright ? " is-bright" : ""}`}
      style={sx({
        width: "100%",
        minHeight: "38px",
        background: bright ? "rgba(255,255,255,0.14)" : emphasis ? "rgba(255,255,255,0.09)" : "transparent",
        border: bright ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(255,255,255,0.09)",
        borderRadius: "6px",
        color: bright ? "rgba(255,255,255,0.9)" : emphasis ? "#fff" : "rgba(255,255,255,0.48)",
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

function DashboardWorkspaceNav({
  account,
  onSignUp,
  onLogin,
  onAccount,
  onImport,
  onSettings,
  onUpgrade,
  onLogout,
}) {
  const hasAccount = !!account.username;

  return (
    <nav className="dashboard-workspace-nav" aria-label="Workspace navigation">
      <div className="dashboard-rail-actions" style={sx({ display: "grid", gap: "10px" })}>
        {hasAccount ? (
          <>
            <RailAction onClick={onImport} emphasis>import</RailAction>
            <RailAction onClick={onAccount} emphasis>account</RailAction>
            <RailAction onClick={onSettings}>settings</RailAction>
            {!account.isPremium ? (
              <RailAction onClick={onUpgrade}>upgrade</RailAction>
            ) : null}
            <RailAction onClick={onLogout}>log out</RailAction>
          </>
        ) : (
          <>
            <RailAction onClick={onLogin}>login</RailAction>
            <RailAction onClick={onSignUp} emphasis>sign up</RailAction>
          </>
        )}
      </div>
    </nav>
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

const landingFeatures = [
  {
    title: "Import",
    kicker: "Chess.com + Lichess",
    body: "Pull recent rapid, blitz, bullet, classical, or correspondence games into a review workspace.",
  },
  {
    title: "Classify",
    kicker: "Move by move",
    body: "Mark every decision as book, best, good, inaccuracy, mistake, blunder, miss, or only move.",
  },
  {
    title: "Replay",
    kicker: "Board first",
    body: "Step through the position with played squares, eval loss, game phase, and clock pressure intact.",
  },
  {
    title: "Explore",
    kicker: "After the mistake",
    body: "Try alternate moves on the board, inspect live engine lines, and compare opening database continuations.",
  },
];

const landingPlanComparison = [
  ["Price", "Free", "$4 per month"],
  ["Game reviews", "1 every 24 hours", "5 every 24 hours"],
  ["Import and analysis queue", "Standard", "Priority"],
  ["Move classifications", "Included", "Included"],
  ["Board review", "Included", "Included"],
  ["Opening explorer", "Included", "Included"],
  ["Saved studies", "1 study", "Unlimited studies"],
  ["Chapters per study", "Up to 10", "Up to 10"],
  ["Teaching use", "Personal study workspace", "Reusable lesson workspaces"],
  ["Account badge", "Standard profile", "Pro badge"],
];

const landingQuotes = [
  ["I stopped blundering my rook in the endgame.", "fenturi12", "1450 -> 1620"],
  ["The review finally showed me why my rook checks were just noise.", "calmfile", "1320 -> 1495"],
  ["Seeing the same pawn ending mistake twice made it impossible to ignore.", "rankwalker", "1710 -> 1818"],
  ["I thought I needed more openings. I actually needed to stop rushing move twenty.", "quiettempo", "1180 -> 1368"],
  ["The move labels made my bad habits obvious without making the review feel like homework.", "fileclosed", "1540 -> 1672"],
  ["I finally understood which mistakes were tactical and which ones started ten moves earlier.", "knightshift", "1645 -> 1779"],
  ["Reviewing the position instead of only the engine number changed how I study.", "backranker", "1288 -> 1431"],
  ["My endgames improved once I could see the same king-placement mistake across multiple games.", "opposition", "1820 -> 1914"],
  ["The sandbox lets me test the move I wanted to play and immediately see what I missed.", "slowbishop", "1395 -> 1526"],
];

function LandingQuotesCarousel() {
  return (
    <section className="landing-testimonial landing-scroll-reveal" aria-label="Player stories">
      <div className="landing-quote-heading">player stories</div>

      <div className="landing-quote-viewport">
        <div className="landing-quote-track">
          {[0, 1].map((groupIndex) => (
            <div
              key={groupIndex}
              className="landing-quote-group"
              aria-hidden={groupIndex === 1 ? "true" : undefined}
            >
              {landingQuotes.map(([quote, user, rating]) => (
                <figure key={`${groupIndex}-${user}`} className="landing-quote-card">
                  <blockquote>"{quote}"</blockquote>
                  <figcaption>
                    <span>{user}</span>
                    <span>{rating}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const educationStudyChapters = [
  {
    number: "01",
    title: "Why 6.Bg5 matters",
    type: "Opening lesson",
    fen: "rnbq1rk1/ppp1ppbp/3p1np1/6B1/2PPP3/2N2N2/PP3PPP/R2QKB1R b KQ - 4 6",
    move: "6. Bg5",
    from: "c1",
    to: "g5",
    line: ["6... h6", "7. Bh4", "g5", "8. Bg3"],
    note: "The pin makes ...e5 harder to play cleanly and gives White time to choose between e5 and Qd2.",
    activity: "Maya added a question for the group",
  },
  {
    number: "02",
    title: "Morphy vs Allies, 1858",
    type: "Historical game",
    fen: "rnb1kb1r/pp2qppp/2p2n2/4p3/2B1P3/1QN5/PPP2PPP/R1B1K2R w KQkq - 2 9",
    move: "9. Bc1",
    from: "c1",
    to: "g5",
    line: ["9. Bg5", "b5", "10. Nxb5", "cxb5"],
    note: "Morphy develops with tempo instead of collecting material. The lesson is activity before the king can become safe.",
    activity: "Coach Jordan annotated the critical move",
  },
];

function LandingEducationDemo({ className = "" }) {
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const activeChapter = educationStudyChapters[activeChapterIndex];
  const board = parseFenBoard(activeChapter.fen);
  const pieceImages = pieceSetById("modern").images;
  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    const intervalId = window.setInterval(() => {
      setActiveChapterIndex((current) => (current + 1) % educationStudyChapters.length);
    }, 5200);
    return () => window.clearInterval(intervalId);
  }, []);

  return (
      <div className={`landing-education-demo ${className}`.trim()} aria-label="Animated example of an educational chess study">
        <div className="landing-education-demo-header">
          <div>
            <span>EDUCATOR STUDY</span>
            <strong>King's Indian: plans and model games</strong>
          </div>
          <span className="landing-education-share">copy study link</span>
        </div>

        <div className="landing-education-demo-body">
          <div className="landing-education-chapters">
            {educationStudyChapters.map((chapter, index) => (
              <button
                key={chapter.number}
                type="button"
                className={index === activeChapterIndex ? "landing-education-chapter is-active" : "landing-education-chapter"}
                onClick={() => setActiveChapterIndex(index)}
              >
                <span>{chapter.number}</span>
                <div>
                  <strong>{chapter.title}</strong>
                  <small>{chapter.type}</small>
                </div>
                <i aria-hidden="true" />
              </button>
            ))}
          </div>

          <div key={activeChapter.number} className="landing-education-board">
            <div className="landing-education-position" aria-label={`Position for ${activeChapter.title}`}>
              {board.flatMap((row, rowIndex) => row.map((piece, columnIndex) => {
                const square = `${files[columnIndex]}${8 - rowIndex}`;
                const isHighlighted = square === activeChapter.from || square === activeChapter.to;
                return (
                  <span
                    key={square}
                    className={`${(rowIndex + columnIndex) % 2 === 0 ? "is-light" : "is-dark"}${isHighlighted ? " is-highlighted" : ""}`}
                  >
                    {piece ? <img src={pieceImages[piece]} alt="" draggable="false" /> : null}
                  </span>
                );
              }))}
            </div>

            <div className="landing-education-lesson">
              <div className="landing-education-current-move">
                <span>FOCUS</span>
                <strong>{activeChapter.move}</strong>
              </div>
              <div className="landing-education-line">
                {activeChapter.line.map((move, index) => <span key={`${move}-${index}`}>{move}</span>)}
              </div>
              <div className="landing-education-note">
                <span>TEACHING NOTE</span>
                <p>{activeChapter.note}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="landing-education-collaborators">
          <div className="landing-collaborator-stack" aria-hidden="true">
            <span>JM</span>
            <span>AK</span>
            <span>+3</span>
          </div>
          <div>
            <strong>{activeChapter.activity}</strong>
            <small>Shared study activity</small>
          </div>
          <span key={activeChapter.number} className="landing-education-saved">chapter saved</span>
        </div>
      </div>
  );
}

function LandingEducationSection() {
  return (
    <section className="landing-education landing-education-overview landing-scroll-reveal">
      <div className="landing-education-copy">
        <span className="landing-education-kicker">Built for educators</span>
        <h2>Teach the idea behind the move.</h2>
        <p>
          Build opening courses, preserve historical games, and annotate the moments students need to understand.
          Every study stays saved so a lesson can continue after the call ends.
        </p>
      </div>

      <div className="landing-education-values">
        <article>
          <span>Opening curriculum</span>
          <p>Separate plans, sidelines, model games, and practice positions into named chapters.</p>
        </article>
        <article>
          <span>Historical games</span>
          <p>Save complete games with variations and explain why the critical decisions mattered.</p>
        </article>
        <article>
          <span>Teach together</span>
          <p>Send one study link and add collaborators for shared preparation, annotations, and review.</p>
        </article>
      </div>
    </section>
  );
}

const landingPreviewGames = [
  {
    id: "rook-endgame",
    moves: [
      {
    move: "39. Ra7",
    label: "book",
    score: "0.00",
    from: "a2",
    to: "a7",
    fenBefore: "6k1/5pp1/7p/4P3/5P2/6P1/R5KP/1r6 w - - 0 39",
    fenAfter: "6k1/R4pp1/7p/4P3/5P2/6P1/6KP/1r6 b - - 1 39",
  },
  {
    move: "39... Rb2+",
    label: "best",
    score: "-0.12",
    from: "b1",
    to: "b2",
    fenBefore: "6k1/R4pp1/7p/4P3/5P2/6P1/6KP/1r6 b - - 1 39",
    fenAfter: "6k1/R4pp1/7p/4P3/5P2/6P1/1r4KP/8 w - - 2 40",
  },
  {
    move: "40. Kf3",
    label: "book",
    score: "0.00",
    from: "g2",
    to: "f3",
    fenBefore: "6k1/R4pp1/7p/4P3/5P2/6P1/1r4KP/8 w - - 2 40",
    fenAfter: "6k1/R4pp1/7p/4P3/5P2/5KP1/1r5P/8 b - - 3 40",
  },
  {
    move: "40... Rb3+",
    label: "inaccuracy",
    score: "+0.34",
    from: "b2",
    to: "b3",
    fenBefore: "6k1/R4pp1/7p/4P3/5P2/5KP1/1r5P/8 b - - 3 40",
    fenAfter: "6k1/R4pp1/7p/4P3/5P2/1r3KP1/7P/8 w - - 4 41",
  },
  {
    move: "41. Ke4",
    label: "best",
    score: "+0.42",
    from: "f3",
    to: "e4",
    fenBefore: "6k1/R4pp1/7p/4P3/5P2/1r3KP1/7P/8 w - - 4 41",
    fenAfter: "6k1/R4pp1/7p/4P3/4KP2/1r4P1/7P/8 b - - 5 41",
  },
  {
    move: "41... Rxg3",
    label: "blunder",
    score: "+2.60",
    from: "b3",
    to: "g3",
    fenBefore: "6k1/R4pp1/7p/4P3/4KP2/1r4P1/7P/8 b - - 5 41",
    fenAfter: "6k1/R4pp1/7p/4P3/4KP2/6r1/7P/8 w - - 0 42",
  },
  {
    move: "42. Rxf7",
    label: "best",
    score: "+1.88",
    from: "a7",
    to: "f7",
    fenBefore: "6k1/R4pp1/7p/4P3/4KP2/6r1/7P/8 w - - 0 42",
    fenAfter: "6k1/5Rp1/7p/4P3/4KP2/6r1/7P/8 b - - 0 42",
  },
    ],
  },
  {
    id: "italian-tension",
    moves: [
      {
        move: "5. d4",
        label: "book",
        score: "+0.20",
        from: "d2",
        to: "d4",
        fenBefore: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2P2N2/PP1P1PPP/RNBQK2R w KQkq - 1 5",
        fenAfter: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2BPP3/2P2N2/PP3PPP/RNBQK2R b KQkq - 0 5",
      },
      {
        move: "5... exd4",
        label: "book",
        score: "+0.18",
        from: "e5",
        to: "d4",
        fenBefore: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2BPP3/2P2N2/PP3PPP/RNBQK2R b KQkq - 0 5",
        fenAfter: "r1bqk2r/pppp1ppp/2n2n2/2b5/2BpP3/2P2N2/PP3PPP/RNBQK2R w KQkq - 0 6",
      },
      {
        move: "6. cxd4",
        label: "best",
        score: "+0.22",
        from: "c3",
        to: "d4",
        fenBefore: "r1bqk2r/pppp1ppp/2n2n2/2b5/2BpP3/2P2N2/PP3PPP/RNBQK2R w KQkq - 0 6",
        fenAfter: "r1bqk2r/pppp1ppp/2n2n2/2b5/2BPP3/5N2/PP3PPP/RNBQK2R b KQkq - 0 6",
      },
      {
        move: "6... Bb4+",
        label: "good",
        score: "+0.11",
        from: "c5",
        to: "b4",
        fenBefore: "r1bqk2r/pppp1ppp/2n2n2/2b5/2BPP3/5N2/PP3PPP/RNBQK2R b KQkq - 0 6",
        fenAfter: "r1bqk2r/pppp1ppp/2n2n2/8/1bBPP3/5N2/PP3PPP/RNBQK2R w KQkq - 1 7",
      },
      {
        move: "7. Nc3",
        label: "best",
        score: "+0.16",
        from: "b1",
        to: "c3",
        fenBefore: "r1bqk2r/pppp1ppp/2n2n2/8/1bBPP3/5N2/PP3PPP/RNBQK2R w KQkq - 1 7",
        fenAfter: "r1bqk2r/pppp1ppp/2n2n2/8/1bBPP3/2N2N2/PP3PPP/R1BQK2R b KQkq - 2 7",
      },
      {
        move: "7... Nxe4",
        label: "inaccuracy",
        score: "+0.54",
        from: "f6",
        to: "e4",
        fenBefore: "r1bqk2r/pppp1ppp/2n2n2/8/1bBPP3/2N2N2/PP3PPP/R1BQK2R b KQkq - 2 7",
        fenAfter: "r1bqk2r/pppp1ppp/2n5/8/1bBPn3/2N2N2/PP3PPP/R1BQK2R w KQkq - 0 8",
      },
      {
        move: "8. O-O",
        label: "best",
        score: "+0.48",
        from: "e1",
        to: "g1",
        fenBefore: "r1bqk2r/pppp1ppp/2n5/8/1bBPn3/2N2N2/PP3PPP/R1BQK2R w KQkq - 0 8",
        fenAfter: "r1bqk2r/pppp1ppp/2n5/8/1bBPn3/2N2N2/PP3PPP/R1BQ1RK1 b kq - 1 8",
      },
    ],
  },
  {
    id: "sicilian-storm",
    moves: [
      {
        move: "8. Qf3",
        label: "book",
        score: "+0.28",
        from: "d1",
        to: "f3",
        fenBefore: "rnbqk2r/1p2bppp/p2ppn2/6B1/3NPP2/2N5/PPP3PP/R2QKB1R w KQkq - 1 8",
        fenAfter: "rnbqk2r/1p2bppp/p2ppn2/6B1/3NPP2/2N2Q2/PPP3PP/R3KB1R b KQkq - 2 8",
      },
      {
        move: "8... Qc7",
        label: "book",
        score: "+0.21",
        from: "d8",
        to: "c7",
        fenBefore: "rnbqk2r/1p2bppp/p2ppn2/6B1/3NPP2/2N2Q2/PPP3PP/R3KB1R b KQkq - 2 8",
        fenAfter: "rnb1k2r/1pq1bppp/p2ppn2/6B1/3NPP2/2N2Q2/PPP3PP/R3KB1R w KQkq - 3 9",
      },
      {
        move: "9. O-O-O",
        label: "best",
        score: "+0.34",
        from: "e1",
        to: "c1",
        fenBefore: "rnb1k2r/1pq1bppp/p2ppn2/6B1/3NPP2/2N2Q2/PPP3PP/R3KB1R w KQkq - 3 9",
        fenAfter: "rnb1k2r/1pq1bppp/p2ppn2/6B1/3NPP2/2N2Q2/PPP3PP/2KR1B1R b kq - 4 9",
      },
      {
        move: "9... Nbd7",
        label: "good",
        score: "+0.29",
        from: "b8",
        to: "d7",
        fenBefore: "rnb1k2r/1pq1bppp/p2ppn2/6B1/3NPP2/2N2Q2/PPP3PP/2KR1B1R b kq - 4 9",
        fenAfter: "r1b1k2r/1pqnbppp/p2ppn2/6B1/3NPP2/2N2Q2/PPP3PP/2KR1B1R w kq - 5 10",
      },
      {
        move: "10. g4",
        label: "best",
        score: "+0.42",
        from: "g2",
        to: "g4",
        fenBefore: "r1b1k2r/1pqnbppp/p2ppn2/6B1/3NPP2/2N2Q2/PPP3PP/2KR1B1R w kq - 5 10",
        fenAfter: "r1b1k2r/1pqnbppp/p2ppn2/6B1/3NPPP1/2N2Q2/PPP4P/2KR1B1R b kq - 0 10",
      },
    ],
  },
  {
    id: "queens-gambit",
    moves: [
      {
        move: "8. cxd5",
        label: "book",
        score: "+0.18",
        from: "c4",
        to: "d5",
        fenBefore: "rnbq1rk1/p1p1bpp1/1p2pn1p/3p4/2PP3B/2N1PN2/PP3PPP/R2QKB1R w KQ - 0 8",
        fenAfter: "rnbq1rk1/p1p1bpp1/1p2pn1p/3P4/3P3B/2N1PN2/PP3PPP/R2QKB1R b KQ - 0 8",
      },
      {
        move: "8... Nxd5",
        label: "book",
        score: "+0.12",
        from: "f6",
        to: "d5",
        fenBefore: "rnbq1rk1/p1p1bpp1/1p2pn1p/3P4/3P3B/2N1PN2/PP3PPP/R2QKB1R b KQ - 0 8",
        fenAfter: "rnbq1rk1/p1p1bpp1/1p2p2p/3n4/3P3B/2N1PN2/PP3PPP/R2QKB1R w KQ - 0 9",
      },
      {
        move: "9. Bxe7",
        label: "best",
        score: "+0.17",
        from: "h4",
        to: "e7",
        fenBefore: "rnbq1rk1/p1p1bpp1/1p2p2p/3n4/3P3B/2N1PN2/PP3PPP/R2QKB1R w KQ - 0 9",
        fenAfter: "rnbq1rk1/p1p1Bpp1/1p2p2p/3n4/3P4/2N1PN2/PP3PPP/R2QKB1R b KQ - 0 9",
      },
      {
        move: "9... Qxe7",
        label: "good",
        score: "+0.11",
        from: "d8",
        to: "e7",
        fenBefore: "rnbq1rk1/p1p1Bpp1/1p2p2p/3n4/3P4/2N1PN2/PP3PPP/R2QKB1R b KQ - 0 9",
        fenAfter: "rnb2rk1/p1p1qpp1/1p2p2p/3n4/3P4/2N1PN2/PP3PPP/R2QKB1R w KQ - 0 10",
      },
      {
        move: "10. Nxd5",
        label: "best",
        score: "+0.23",
        from: "c3",
        to: "d5",
        fenBefore: "rnb2rk1/p1p1qpp1/1p2p2p/3n4/3P4/2N1PN2/PP3PPP/R2QKB1R w KQ - 0 10",
        fenAfter: "rnb2rk1/p1p1qpp1/1p2p2p/3N4/3P4/4PN2/PP3PPP/R2QKB1R b KQ - 0 10",
      },
      {
        move: "10... exd5",
        label: "good",
        score: "+0.16",
        from: "e6",
        to: "d5",
        fenBefore: "rnb2rk1/p1p1qpp1/1p2p2p/3N4/3P4/4PN2/PP3PPP/R2QKB1R b KQ - 0 10",
        fenAfter: "rnb2rk1/p1p1qpp1/1p5p/3p4/3P4/4PN2/PP3PPP/R2QKB1R w KQ - 0 11",
      },
      {
        move: "11. Rc1",
        label: "best",
        score: "+0.28",
        from: "a1",
        to: "c1",
        fenBefore: "rnb2rk1/p1p1qpp1/1p5p/3p4/3P4/4PN2/PP3PPP/R2QKB1R w KQ - 0 11",
        fenAfter: "rnb2rk1/p1p1qpp1/1p5p/3p4/3P4/4PN2/PP3PPP/2RQKB1R b K - 1 11",
      },
    ],
  },
  {
    id: "kingside-pressure",
    moves: [
      {
        move: "8. d5",
        label: "book",
        score: "+0.10",
        from: "d4",
        to: "d5",
        fenBefore: "r1bq1rk1/ppp2pbp/2np1np1/4p3/2PPP3/2N2N2/PP2BPPP/R1BQ1RK1 w - - 2 8",
        fenAfter: "r1bq1rk1/ppp2pbp/2np1np1/3Pp3/2P1P3/2N2N2/PP2BPPP/R1BQ1RK1 b - - 0 8",
      },
      {
        move: "8... Ne7",
        label: "good",
        score: "+0.08",
        from: "c6",
        to: "e7",
        fenBefore: "r1bq1rk1/ppp2pbp/2np1np1/3Pp3/2P1P3/2N2N2/PP2BPPP/R1BQ1RK1 b - - 0 8",
        fenAfter: "r1bq1rk1/ppp1npbp/3p1np1/3Pp3/2P1P3/2N2N2/PP2BPPP/R1BQ1RK1 w - - 1 9",
      },
      {
        move: "9. b4",
        label: "best",
        score: "+0.22",
        from: "b2",
        to: "b4",
        fenBefore: "r1bq1rk1/ppp1npbp/3p1np1/3Pp3/2P1P3/2N2N2/PP2BPPP/R1BQ1RK1 w - - 1 9",
        fenAfter: "r1bq1rk1/ppp1npbp/3p1np1/3Pp3/1PP1P3/2N2N2/P3BPPP/R1BQ1RK1 b - - 0 9",
      },
      {
        move: "9... a5",
        label: "good",
        score: "+0.18",
        from: "a7",
        to: "a5",
        fenBefore: "r1bq1rk1/ppp1npbp/3p1np1/3Pp3/1PP1P3/2N2N2/P3BPPP/R1BQ1RK1 b - - 0 9",
        fenAfter: "r1bq1rk1/1pp1npbp/3p1np1/p2Pp3/1PP1P3/2N2N2/P3BPPP/R1BQ1RK1 w - - 0 10",
      },
      {
        move: "10. Ba3",
        label: "best",
        score: "+0.31",
        from: "c1",
        to: "a3",
        fenBefore: "r1bq1rk1/1pp1npbp/3p1np1/p2Pp3/1PP1P3/2N2N2/P3BPPP/R1BQ1RK1 w - - 0 10",
        fenAfter: "r1bq1rk1/1pp1npbp/3p1np1/p2Pp3/1PP1P3/B1N2N2/P3BPPP/R2Q1RK1 b - - 1 10",
      },
    ],
  },
];

function landingAnnotationFromMove(move) {
  const moveIndex = Number.parseInt(move.move, 10);
  const isBlackMove = move.move.includes("...");

  return {
    ply: moveIndex * 2 - (isBlackMove ? 0 : 1),
    move_index: moveIndex,
    san: move.move.split(" ").at(-1),
    classification: move.label,
    from_square: move.from,
    to_square: move.to,
    fen_before: move.fenBefore,
    fen_after: move.fenAfter,
    evaluation_after: Number(move.score),
    cp_loss: move.label === "blunder" ? 418 : move.label === "inaccuracy" ? 72 : 0,
  };
}

function landingPreviewAt(preview) {
  const game = landingPreviewGames[preview.gameIndex] || landingPreviewGames[0];
  const move = game.moves[preview.moveIndex] || game.moves[0];

  return { game, move };
}

function landingPreviewKey(preview) {
  return `${preview.gameIndex}-${preview.moveIndex}`;
}

function randomLandingPreviewAfter(currentPreview, recentGameIndexes = []) {
  const gameIndexes = landingPreviewGames.map((_, index) => index);
  const blockedIndexes = new Set([currentPreview.gameIndex, ...recentGameIndexes.slice(-2)]);
  let candidates = gameIndexes.filter((index) => !blockedIndexes.has(index));

  if (!candidates.length) {
    candidates = gameIndexes.filter((index) => index !== currentPreview.gameIndex);
  }

  const gameIndex = candidates[Math.floor(Math.random() * candidates.length)] || 0;
  const game = landingPreviewGames[gameIndex] || landingPreviewGames[0];
  const moveIndex = Math.floor(Math.random() * game.moves.length);

  return { gameIndex, moveIndex };
}

function LandingPreviewBoard({ preview, showMoveAfter }) {
  const { move } = landingPreviewAt(preview);
  const annotation = landingAnnotationFromMove(move);

  return (
    <div className="landing-board-frame">
      <Board
        key={landingPreviewKey(preview)}
        fen={showMoveAfter ? move.fenAfter : move.fenBefore}
        annotation={annotation}
        interactive={false}
        showMoveBadge={false}
        showCoordinates={false}
        maxWidth="500px"
        minWidth="0"
      />
    </div>
  );
}

function LandingPreview() {
  const reduceMotion = useReducedMotion();
  const [activePreview, setActivePreview] = useState({ gameIndex: 0, moveIndex: 0 });
  const [activeMoveSettled, setActiveMoveSettled] = useState(false);
  const [transitionPreview, setTransitionPreview] = useState(null);
  const [transitionMoveSettled, setTransitionMoveSettled] = useState(false);
  const recentGameIndexesRef = useRef([0]);

  useEffect(() => {
    const timers = [];

    if (!activeMoveSettled) {
      timers.push(window.setTimeout(() => {
        setActiveMoveSettled(true);
      }, 180));
      return () => {
        timers.forEach((timer) => window.clearTimeout(timer));
      };
    }

    timers.push(window.setTimeout(() => {
      const nextPreview = randomLandingPreviewAfter(activePreview, recentGameIndexesRef.current);
      recentGameIndexesRef.current = [...recentGameIndexesRef.current, nextPreview.gameIndex].slice(-3);

      setTransitionPreview(nextPreview);
      setTransitionMoveSettled(false);

      timers.push(window.setTimeout(() => {
        setTransitionMoveSettled(true);
      }, 120));

      timers.push(window.setTimeout(() => {
        setActivePreview(nextPreview);
        setActiveMoveSettled(true);
        setTransitionPreview(null);
      }, 1080));
    }, 5000));

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [activePreview, activeMoveSettled]);

  return (
    <motion.div
      className={transitionPreview ? "landing-preview is-transitioning" : "landing-preview"}
      initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.72, delay: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
      whileHover={reduceMotion ? undefined : { y: -5, rotateX: 0.8, rotateY: -0.8 }}
      style={sx({
        display: "grid",
        minWidth: 0,
        borderTop: "1px solid rgba(255,255,255,0.08)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        padding: "var(--landing-preview-padding)",
        background: "rgba(8,8,8,0.72)",
        backdropFilter: "blur(14px)",
      })}
    >
      <div className="landing-preview-board-stack">
        <div className="landing-preview-active-board">
          <LandingPreviewBoard
            preview={activePreview}
            showMoveAfter={activeMoveSettled}
          />
        </div>

        {transitionPreview ? (
          <div className="landing-preview-transition-board" aria-hidden="true">
            <LandingPreviewBoard
              preview={transitionPreview}
              showMoveAfter={transitionMoveSettled}
            />
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}

function LandingAnalysisSection() {
  return (
    <section className="landing-analysis landing-scroll-reveal">
      <div className="landing-analysis-heading">
        <span>Supporting analysis</span>
        <h2>The engine serves the lesson.</h2>
        <p>
          Find the costly move, explain why the position changed, and explore better continuations without turning the lesson into a wall of engine output.
        </p>
      </div>

      <div className="landing-analysis-layout">
        <div className="landing-analysis-preview">
          <LandingPreview />
        </div>

        <div className="landing-stagger landing-analysis-features">
          {landingFeatures.map((feature, index) => (
            <article
              key={feature.title}
              className="landing-feature"
              style={sx({
                "--landing-row-delay": `${index * 90}ms`,
                display: "grid",
                gap: "9px",
              })}
            >
              <span>{feature.kicker}</span>
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function LandingPage({ account, onSignUp, onLogin, onDashboard, onAnalysis, onAccount, onUpgrade }) {
  const hasAccount = !!account?.username;
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const root = document.querySelector(".landing-page");
    if (!root) return undefined;

    const revealTargets = [...root.querySelectorAll(".landing-scroll-reveal")];
    const reveal = (element) => element.classList.add("is-visible");
    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      revealTargets.forEach(reveal);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          reveal(entry.target);
          observer.unobserve(entry.target);
        }
      },
      {
        rootMargin: "0px 0px -12% 0px",
        threshold: 0.18,
      }
    );

    revealTargets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  return (
    <AppShell
      view="landing"
      onHome={() => {}}
      headerActions={(
        <LandingProAction
          isPremium={!!account?.isPremium}
          onAccount={onAccount}
          onUpgrade={onUpgrade}
        />
      )}
    >
      <main
        className="landing-page"
        style={sx({
          maxWidth: "1240px",
          display: "grid",
          gap: "68px",
        })}
      >
        <motion.section
          className="landing-hero"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.55 }}
          style={sx({
            display: "grid",
            gridTemplateColumns: "minmax(320px, 0.98fr) minmax(420px, 0.92fr)",
            gap: 0,
            alignItems: "center",
            position: "relative",
          })}
        >
          <motion.div
            className="landing-hero-copy"
            initial={reduceMotion ? false : { opacity: 0, x: -26 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
            style={sx({
              display: "grid",
              gap: "28px",
              minWidth: 0,
              position: "relative",
              zIndex: 2,
              paddingRight: "42px",
            })}
          >
            <div style={sx({ fontSize: "12px", letterSpacing: ".18em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)" })}>
              chess studies for teaching and learning
            </div>
            <h1
              className="landing-title"
              style={sx({
                margin: 0,
                fontSize: "64px",
                lineHeight: 1.02,
                fontWeight: 200,
                color: "#fff",
                letterSpacing: 0,
                maxWidth: "720px",
              })}
            >
              Chess education, reimagined.
            </h1>
            <p
              className="landing-copy"
              style={sx({
                margin: 0,
                maxWidth: "620px",
                color: "rgba(255,255,255,0.56)",
                fontSize: "20px",
                lineHeight: 1.55,
              })}
            >
              Build opening courses, preserve model games, annotate critical moments, and share a study students can return to after the lesson ends.
            </p>
            <div
              className="landing-cta-row"
              style={sx({ display: "flex", gap: "14px", flexWrap: "wrap", alignItems: "center", paddingTop: "6px" })}
            >
              <button
                type="button"
                onClick={hasAccount ? onDashboard : onSignUp}
                className="landing-action"
                style={sx({
                  border: "1px solid rgba(255,255,255,0.22)",
                  background: "rgba(255,255,255,0.12)",
                  color: "#fff",
                  minHeight: "42px",
                  padding: "11px 16px",
                  borderRadius: "6px",
                  fontFamily: "inherit",
                  fontSize: "14px",
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                })}
              >
                {hasAccount ? "open dashboard" : "create a study"}
              </button>
              <button
                type="button"
                onClick={onAnalysis}
                className="landing-action is-secondary"
                style={sx({
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "transparent",
                  color: "rgba(255,255,255,0.54)",
                  minHeight: "42px",
                  padding: "11px 16px",
                  borderRadius: "6px",
                  fontFamily: "inherit",
                  fontSize: "14px",
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                })}
              >
                analyze a position
              </button>
              {!hasAccount ? (
                <button
                  type="button"
                  onClick={onLogin}
                  className="landing-login-action"
                  style={sx({
                    border: "none",
                    borderBottom: "1px solid rgba(255,255,255,0.14)",
                    background: "transparent",
                    color: "rgba(255,255,255,0.4)",
                    minHeight: "34px",
                    padding: "6px 0",
                    fontFamily: "inherit",
                    fontSize: "13px",
                    letterSpacing: ".08em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                  })}
                >
                  log in
                </button>
              ) : null}
              {hasAccount ? (
                <span style={sx({ color: "rgba(255,255,255,0.28)", fontSize: "13px" })}>{account.username}</span>
              ) : null}
            </div>
            <div className="landing-status-row">
              <span>1434 games analyzed</span>
              <span>180 users</span>
              <span>∞ study sessions</span>
            </div>
          </motion.div>
          <motion.div
            className="landing-hero-preview"
            initial={reduceMotion ? false : { opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.72, delay: 0.08, ease: [0.2, 0.8, 0.2, 1] }}
            style={sx({
              position: "relative",
              zIndex: 1,
              marginLeft: "-52px",
            })}
          >
            <LandingEducationDemo className="landing-hero-education-demo" />
          </motion.div>
        </motion.section>

        <LandingEducationSection />

        <LandingAnalysisSection />

        <LandingQuotesCarousel />

        <section
          className="landing-pricing landing-scroll-reveal"
        >
          <div className="landing-pricing-heading">
            <span>plans</span>
            <h2>Compare Regular and Pro</h2>
            <p>Both plans include the complete review experience. Pro increases review capacity, queue priority, and study access.</p>
          </div>

          <div className="landing-plan-table-wrap">
            <table className="landing-plan-table">
              <thead>
                <tr>
                  <th scope="col">Feature</th>
                  <th scope="col">
                    <span>Regular</span>
                    <strong>$0</strong>
                  </th>
                  <th scope="col" className="is-pro">
                    <span>Pro</span>
                    <strong>$4/month</strong>
                  </th>
                </tr>
              </thead>
              <tbody>
                {landingPlanComparison.map(([feature, regular, pro]) => (
                  <tr key={feature}>
                    <th scope="row">{feature}</th>
                    <td>{regular}</td>
                    <td className="is-pro">{pro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section
          className="landing-community landing-scroll-reveal"
          style={sx({
            display: "grid",
            gridTemplateColumns: "260px minmax(0, 1fr)",
            gap: "44px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            padding: "30px 0",
          })}
        >
          <div
            className="landing-community-label"
            style={sx({
              "--landing-row-delay": "0ms",
              fontSize: "12px",
              letterSpacing: ".18em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.28)",
            })}
          >
            community
          </div>
          <div
            className="landing-community-copy"
            style={sx({
              "--landing-row-delay": "90ms",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "22px",
              flexWrap: "wrap",
            })}
          >
            <p style={sx({ margin: 0, maxWidth: "620px", color: "rgba(255,255,255,0.52)", fontSize: "18px", lineHeight: 1.5 })}>
              Talk through review habits, share suspicious positions, and help shape what blunder.ch becomes next.
            </p>
            <a
              href={DISCORD_INVITE_URL}
              target="_blank"
              rel="noreferrer"
              className="landing-community-link"
              style={sx({
                "--landing-row-delay": "180ms",
                color: "rgba(255,255,255,0.72)",
                minHeight: "38px",
                display: "inline-flex",
                alignItems: "center",
                border: "1px solid rgba(255,255,255,0.16)",
                background: "rgba(255,255,255,0.045)",
                borderRadius: "6px",
                padding: "9px 13px",
                fontSize: "12px",
                letterSpacing: ".08em",
                textTransform: "uppercase",
                textDecoration: "none",
              })}
            >
              join discord
            </a>
          </div>
        </section>

      </main>
    </AppShell>
  );
}

function SettingsPage({
  boardThemeId,
  onBoardThemeChange,
  pieceSetId,
  onPieceSetChange,
  onBack,
}) {
  return (
    <AppShell view="settings" onHome={onBack}>
      <main
        className="settings-page"
        style={sx({
          maxWidth: "980px",
          display: "grid",
          gap: "34px",
        })}
      >
        <div>
          <div style={sx({ fontSize: "13px", letterSpacing: ".16em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)", marginBottom: "12px" })}>
            /settings
          </div>
          <h1 style={sx({ margin: 0, fontSize: "42px", color: "#fff", fontWeight: 200 })}>
            Preferences
          </h1>
        </div>

        <DashboardSettings
          boardThemeId={boardThemeId}
          onBoardThemeChange={onBoardThemeChange}
          pieceSetId={pieceSetId}
          onPieceSetChange={onPieceSetChange}
        />

        <button
          type="button"
          onClick={onBack}
          style={sx({
            justifySelf: "start",
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
      </main>
    </AppShell>
  );
}

function ProfileSettingsPage({ account, onAccountChange, onOpenProfile, onBack }) {
  const [avatarStatus, setAvatarStatus] = useState("");
  const [avatarSaving, setAvatarSaving] = useState(false);
  const profileUrl = typeof window === "undefined"
    ? profilePath(account)
    : `${window.location.origin}${profilePath(account)}`;

  async function saveAvatar({ avatarPreset, avatarDataUrl = "" }) {
    setAvatarSaving(true);
    setAvatarStatus("");

    try {
      const response = await fetch(apiUrl("/api/users/profile"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: account.platform,
          username: account.username,
          avatarPreset,
          avatarDataUrl,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to update profile picture.");

      onAccountChange({
        avatarPreset: payload.avatar_preset,
        avatarDataUrl: payload.avatar_data_url || "",
        profileSlug: payload.profile_slug || account.profileSlug,
      });
      setAvatarStatus("Profile picture updated.");
    } catch (error) {
      setAvatarStatus(error.message || "Unable to update profile picture.");
    } finally {
      setAvatarSaving(false);
    }
  }

  function handleAvatarUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type) || file.size > 500_000) {
      setAvatarStatus("Use a PNG, JPEG, WebP, or GIF under 500 KB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => saveAvatar({
      avatarPreset: account.avatarPreset || "white-knight",
      avatarDataUrl: String(reader.result || ""),
    });
    reader.onerror = () => setAvatarStatus("Unable to read that image.");
    reader.readAsDataURL(file);
  }

  return (
    <AppShell view="profile-settings" onHome={onBack}>
      <main className="profile-settings-page">
        <div className="profile-settings-heading">
          <span>/profile</span>
          <h1>Your profile</h1>
          <p>Choose how your account appears across blunder.ch.</p>
        </div>

        <section className="profile-settings">
          <div className="dashboard-settings-header">
            <span>profile picture</span>
            <span>{account.isPremium ? "pro" : "free"}</span>
          </div>

          <div className="profile-settings-summary">
            <ProfileAvatar profile={account} size="96px" />
            <div>
              <strong>{account.username}</strong>
              <span>{account.platform}</span>
              <button type="button" onClick={onOpenProfile}>view public profile</button>
            </div>
          </div>

          <div className="profile-link-row">
            <input value={profileUrl} readOnly aria-label="Public profile URL" />
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(profileUrl).then(
                () => setAvatarStatus("Profile link copied."),
                () => setAvatarStatus("Unable to copy profile link.")
              )}
            >
              copy link
            </button>
          </div>

          <div className="avatar-preset-grid">
            {avatarPresets.map((preset) => {
              const isActive = !account.avatarDataUrl && account.avatarPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  disabled={avatarSaving}
                  className={isActive ? "avatar-preset is-active" : "avatar-preset"}
                  aria-pressed={isActive}
                  onClick={() => saveAvatar({ avatarPreset: preset.id })}
                >
                  <ProfileAvatar profile={{ avatarPreset: preset.id }} size="58px" />
                  <span>{preset.label}</span>
                </button>
              );
            })}
          </div>

          <div className="custom-avatar-upload">
            <div>
              <strong>Custom profile picture</strong>
              <span>{account.isPremium ? "PNG, JPEG, WebP, or GIF. 500 KB maximum." : "Custom uploads are available with Pro."}</span>
            </div>
            <label className={account.isPremium ? "" : "is-disabled"}>
              upload
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                disabled={!account.isPremium || avatarSaving}
                onChange={handleAvatarUpload}
              />
            </label>
          </div>

          {avatarStatus ? <p className="profile-settings-status">{avatarStatus}</p> : null}
        </section>

        <button type="button" className="profile-back-button" onClick={onBack}>dashboard</button>
      </main>
    </AppShell>
  );
}

function ProfilePage({ profileIdentity, onBack }) {
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      setStatus("loading");
      setError("");

      try {
        const response = await fetch(apiUrl(
          `/api/users/profile/${encodeURIComponent(profileIdentity.slug)}`
        ));
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Unable to load profile.");
        if (active) setProfile(payload);
      } catch (loadError) {
        if (active) setError(loadError.message || "Unable to load profile.");
      } finally {
        if (active) setStatus("idle");
      }
    }

    loadProfile();
    return () => {
      active = false;
    };
  }, [profileIdentity.slug]);

  return (
    <AppShell view="profile" onHome={onBack}>
      <main className="profile-page">
        {status === "loading" ? (
          <section className="public-profile-card">Loading profile.</section>
        ) : error ? (
          <section className="public-profile-card">
            <span className="profile-kicker">player profile</span>
            <h1>Profile unavailable</h1>
            <p>{error}</p>
          </section>
        ) : (
          <section className="public-profile-card">
            <ProfileAvatar profile={profile} size="132px" />
            <div className="public-profile-copy">
              <span className="profile-kicker">{profile.provider} player</span>
              <h1>{profile.username}</h1>
              <div className="public-profile-meta">
                <span>{profile.is_premium ? "Pro member" : "Free member"}</span>
                <span>
                  Joined {profile.created_at
                    ? new Date(profile.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })
                    : "recently"}
                </span>
              </div>
              <div className="public-profile-badges">
                {(profile.badges || []).map((badge) => (
                  <span key={badge.id}>{badge.label}</span>
                ))}
              </div>
            </div>
          </section>
        )}

        <button type="button" className="profile-back-button" onClick={onBack}>back</button>
      </main>
    </AppShell>
  );
}

function SignUpPage({ onBack, onImported, onRegistered }) {
  return (
    <AppShell view="signup" onBack={onBack} onHome={onBack}>
      <main className="auth-page auth-page-signup">
        <SignupWizard onImported={onImported} onRegistered={onRegistered} />
      </main>
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
      <form className="auth-page auth-page-login" onSubmit={handleSubmit} style={sx({ maxWidth: "420px" })}>
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
              color: status === "error" ? "rgba(255,255,255,0.62)" : "rgba(255,255,255,0.35)",
            })}
          >
            {message}
          </p>
        ) : null}
      </form>
    </AppShell>
  );
}

function DevResetPage({ onHome, onResetComplete }) {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [checked, setChecked] = useState(false);
  const [stats, setStats] = useState(null);
  const canSubmit = checked && code.trim().length >= 32 && status !== "loading";
  const canLoadStats = code.trim().length >= 32 && status !== "loading";

  async function loadStats() {
    if (!canLoadStats) return;

    setStatus("loading");
    setMessage("loading admin stats");

    try {
      const response = await fetch(apiUrl("/api/admin/stats"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "unable to load stats");
      }

      setStats(payload);
      setStatus("success");
      setMessage("stats loaded");
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "unable to load stats");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;

    setStatus("loading");
    setMessage("resetting database");

    try {
      const response = await fetch(apiUrl("/api/admin/reset-database"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "reset failed");
      }

      if (typeof window !== "undefined") {
        window.localStorage.removeItem(ACCOUNT_STORAGE_KEY);
        window.localStorage.removeItem(BROWSER_ANALYSIS_STORAGE_KEY);
      }

      setCode("");
      setChecked(false);
      setStats({ signedUp: 0, upgraded: 0 });
      setStatus("success");
      setMessage("database reset complete");
      onResetComplete?.();
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "reset failed");
    }
  }

  const inputStyle = sx({
    width: "100%",
    background: "transparent",
    border: "none",
    borderBottom: "1px solid rgba(255,255,255,0.12)",
    color: "#fff",
    fontSize: "16px",
    fontWeight: 200,
    padding: "12px 0",
    outline: "none",
    fontFamily: "inherit",
  });

  return (
    <AppShell view="dev" onHome={onHome}>
      <main
        className="dev-page"
        style={sx({
          maxWidth: "720px",
          display: "grid",
          gap: "32px",
        })}
      >
        <div>
          <div style={sx({ fontSize: "12px", letterSpacing: ".18em", textTransform: "uppercase", color: "rgba(255,255,255,0.26)", marginBottom: "14px" })}>
            private dev panel
          </div>
          <h1 style={sx({ margin: 0, color: "#fff", fontSize: "42px", fontWeight: 200, lineHeight: 1.08 })}>
            Reset production data
          </h1>
        </div>

        <div
          style={sx({
            borderTop: "1px solid rgba(255,255,255,0.08)",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            padding: "22px 0",
            display: "grid",
            gap: "12px",
            color: "rgba(255,255,255,0.48)",
            fontSize: "14px",
            lineHeight: 1.55,
          })}
        >
          <span>This deletes users, imports, games, and move annotations.</span>
          <span>It also clears the import and analysis queues.</span>
          <span>Pause the Railway backend-worker before resetting, then restart it after.</span>
          <span>Stripe subscriptions are not cancelled by this reset.</span>
        </div>

        <section
          style={sx({
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "14px",
          })}
        >
          {[
            ["signed up", stats?.signedUp],
            ["upgraded", stats?.upgraded],
          ].map(([label, value]) => (
            <div
              key={label}
              style={sx({
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "8px",
                padding: "18px",
                display: "grid",
                gap: "8px",
              })}
            >
              <span style={sx({ color: "rgba(255,255,255,0.3)", fontSize: "11px", letterSpacing: ".14em", textTransform: "uppercase" })}>
                {label}
              </span>
              <span style={sx({ color: "#fff", fontSize: "32px", fontWeight: 200 })}>
                {value ?? "-"}
              </span>
            </div>
          ))}
        </section>

        <form onSubmit={handleSubmit} style={sx({ display: "grid", gap: "24px" })}>
          <label style={sx({ display: "grid", gap: "10px" })}>
            <span style={sx({ fontSize: "11px", letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" })}>
              reset code
            </span>
            <input
              type="password"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoComplete="off"
              spellCheck="false"
              style={inputStyle}
            />
          </label>

          <label style={sx({ display: "flex", alignItems: "flex-start", gap: "12px", color: "rgba(255,255,255,0.48)", fontSize: "14px", lineHeight: 1.45 })}>
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) => setChecked(event.target.checked)}
              style={sx({ marginTop: "3px", accentColor: "#fff" })}
            />
            <span>I understand this resets the live blunder.ch database.</span>
          </label>

          <div style={sx({ display: "flex", gap: "12px", flexWrap: "wrap" })}>
            <button
              type="button"
              disabled={!canLoadStats}
              onClick={loadStats}
              style={sx({
                border: "1px solid rgba(255,255,255,0.14)",
                background: canLoadStats ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.025)",
                color: canLoadStats ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.26)",
                cursor: canLoadStats ? "pointer" : "default",
                minHeight: "40px",
                padding: "10px 14px",
                borderRadius: "6px",
                fontFamily: "inherit",
                fontSize: "13px",
                letterSpacing: ".1em",
                textTransform: "uppercase",
              })}
            >
              load stats
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              style={sx({
                border: "1px solid rgba(255,255,255,0.14)",
                background: canSubmit ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.025)",
                color: canSubmit ? "#fff" : "rgba(255,255,255,0.26)",
                cursor: canSubmit ? "pointer" : "default",
                minHeight: "40px",
                padding: "10px 14px",
                borderRadius: "6px",
                fontFamily: "inherit",
                fontSize: "13px",
                letterSpacing: ".1em",
                textTransform: "uppercase",
              })}
            >
              {status === "loading" ? "resetting" : "reset database"}
            </button>
          </div>

          {message ? (
            <div
              style={sx({
                color: status === "error" ? "rgba(255,255,255,0.62)" : "rgba(255,255,255,0.48)",
                fontSize: "13px",
                letterSpacing: ".08em",
                textTransform: "uppercase",
              })}
            >
              {message}
            </div>
          ) : null}
        </form>
      </main>
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

  function handleLogoClick() {
    if (typeof window === "undefined") {
      onMinimize?.();
      return;
    }

    window.dispatchEvent(new CustomEvent(LANDING_NAVIGATION_EVENT));
  }

  return (
    <div className="app-shell loading-page" style={styles.app}>
      <style>
        {`
          @keyframes premiumLoadingOrbit {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>

      <div className="app-shell-header" style={styles.header}>
        <button
          type="button"
          onClick={handleLogoClick}
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
        className="loading-close"
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
        className="loading-stage"
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
        className="loading-progress"
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
        border: isPremium ? "1px solid rgba(255,255,255,0.34)" : "1px solid rgba(255,255,255,0.18)",
        background: isPremium ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.07)",
        color: isPremium ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.82)",
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
        className="account-layout"
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
              color: billingNotice.toLowerCase().includes("unable") ? "rgba(255,255,255,0.62)" : "rgba(255,255,255,0.38)",
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
                  color: redeemStatus === "error" ? "rgba(255,255,255,0.62)" : "rgba(255,255,255,0.35)",
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
        className="upgrade-layout"
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
            <UpgradeMetric label="daily allowance" value="5 games" />
            <UpgradeMetric label="replenish" value="24:00 clock" />
            <UpgradeMetric label="price" value="$4 / month" />
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
                color: status === "error" ? "rgba(255,255,255,0.62)" : "rgba(255,255,255,0.42)",
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
  if (!Number.isFinite(ms) || ms <= 0) return "24:00:00";

  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function ImportAllowanceMeter({ remaining, limit }) {
  const total = Math.max(1, Number(limit) || 1);
  const available = Math.max(0, Math.min(total, Number(remaining) || 0));

  return (
    <div
      aria-label={`${available} of ${total} imports remain`}
      style={sx({
        display: "grid",
        gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))`,
        gap: "4px",
        width: "100%",
      })}
    >
      {Array.from({ length: total }).map((_, index) => (
        <span
          key={index}
          style={sx({
            height: "18px",
            border: "1px solid rgba(255,255,255,0.14)",
            background: index < available ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.035)",
          })}
        />
      ))}
    </div>
  );
}

function ImportPage({ account, onBack, onImported }) {
  const [allowance, setAllowance] = useState(null);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const plan = allowance?.isPremium || account.isPremium ? "pro" : "free";

  function allowanceSnapshot(kind) {
    const limitKey = kind === "pro" ? "proLimit" : "freeLimit";
    const remainingKey = kind === "pro" ? "proRemaining" : "freeRemaining";
    const usedKey = kind === "pro" ? "proUsed" : "freeUsed";
    const resetKey = kind === "pro" ? "proResetAt" : "freeResetAt";
    const nextLimit = allowance?.[limitKey] ?? (kind === "pro" ? 5 : 1);
    const nextResetAt = allowance?.[resetKey];
    const nextResetMs = nextResetAt ? new Date(nextResetAt).getTime() - now : 0;
    const nextResetElapsed = !!nextResetAt && nextResetMs <= 0;

    return {
      limit: nextLimit,
      remaining: nextResetElapsed ? nextLimit : allowance?.[remainingKey] ?? 0,
      used: nextResetElapsed ? 0 : allowance?.[usedKey] ?? 0,
      resetAt: nextResetAt,
      resetMs: nextResetMs,
    };
  }

  const activeAllowance = allowanceSnapshot(plan);
  const proAllowance = allowanceSnapshot("pro");
  const limit = activeAllowance.limit;
  const remaining = activeAllowance.remaining;
  const used = activeAllowance.used;
  const resetMs = activeAllowance.resetMs;
  const clock = used > 0 && remaining < limit ? formatClock(resetMs) : "24:00:00";
  const canImport = !!allowance && remaining > 0;
  const proUnlocked = plan === "pro";

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
      <form className="import-layout" onSubmit={submit} style={sx({ maxWidth: "980px", display: "grid", gap: "34px" })}>
        <div>
          <div style={sx({ fontSize: "13px", letterSpacing: ".16em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)", marginBottom: "12px" })}>
            /import
          </div>
          <div style={sx({ fontSize: "34px", fontWeight: 200, color: "#fff" })}>
            {account.platform} / {account.username}
          </div>
        </div>

        <div className="import-grid" style={sx({ display: "grid", gridTemplateColumns: "minmax(280px, 360px) minmax(320px, 1fr)", gap: "34px", alignItems: "start" })}>
          <section style={sx({ display: "grid", gap: "14px" })}>
            <div
              className="allowance-panel"
              style={sx({
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.035)",
                color: "#fff",
                padding: "18px",
                display: "grid",
                gap: "10px",
              })}
            >
              <div style={sx({ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "center" })}>
                <span style={sx({ display: "block", fontSize: "22px" })}>{remaining} imports remain</span>
                <VisualDonut
                  value={remaining}
                  total={limit}
                  label="left"
                  size="72px"
                  color="rgba(255,255,255,0.72)"
                />
              </div>
              <ImportAllowanceMeter remaining={remaining} limit={limit} />
              <span style={sx({ color: "rgba(255,255,255,0.42)", fontSize: "14px", lineHeight: 1.5 })}>
                {planLabels[plan]} daily allowance: {remaining} of {limit} games available.
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
              <span style={sx({ display: "block", fontSize: "22px" })}>Pro allowance {proUnlocked ? "unlocked" : "locked"}</span>
              <span style={sx({ color: "rgba(255,255,255,0.42)", fontSize: "14px", lineHeight: 1.5 })}>
                {proUnlocked
                  ? `${proAllowance.remaining} of ${proAllowance.limit} Pro imports available today.`
                  : `Unlock ${proAllowance.limit} daily imports with Pro.`}
              </span>
              <span style={sx({ color: "rgba(255,255,255,0.3)", fontSize: "12px", letterSpacing: ".1em", textTransform: "uppercase" })}>
                refill clock {clock}
              </span>
            </div>
          </section>

          <section style={sx({ display: "grid", gap: "28px" })}>
            {allowance && remaining <= 0 ? (
              <div style={sx({ color: "rgba(255,255,255,0.66)", fontSize: "13px", letterSpacing: ".08em", textTransform: "uppercase" })}>
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
          <p style={sx({ color: status === "error" ? "rgba(255,255,255,0.62)" : "rgba(255,255,255,0.42)", fontSize: "13px", letterSpacing: ".08em", textTransform: "uppercase" })}>
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
      <span style={sx({ background: "rgba(235,235,235,0.92)" })} />
      <span style={sx({ background: "rgba(165,165,165,0.66)" })} />
      <span style={sx({ background: "rgba(42,42,42,0.98)" })} />
    </div>
  );
}

// eslint-disable-next-line no-unused-vars
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
          <div style={sx({ fontSize: "12px", color: "rgba(255,255,255,0.62)", lineHeight: 1.45 })}>
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

function localAnnotationFromMove(move, basePly, index, evaluationAfter = 0) {
  const ply = basePly + index + 1;

  return {
    ply,
    move_index: Math.ceil(ply / 2),
    san: move.san || move.uci,
    fen_before: move.fenBefore,
    fen_after: move.fenAfter,
    from_square: move.from,
    to_square: move.to,
    classification: move.classification || "analysis",
    classificationStatus: move.classificationStatus || "",
    evaluation_before: move.evaluationBefore ?? 0,
    evaluation_after: move.evaluationAfter ?? evaluationAfter,
    evaluation_loss: 0,
    cp_loss: move.cpLoss ?? 0,
    game_phase: "analysis",
  };
}

function StandaloneMoveList({ annotations, activePly, onSelectPly }) {
  const rows = groupAnnotationsByMove(annotations);

  return (
    <div className="analysis-move-list" style={sx({ display: "grid", gap: "1px", maxHeight: "360px", overflowY: "auto", scrollbarWidth: "none", msOverflowStyle: "none" })}>
      {rows.length ? rows.map((row) => (
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
          <MoveListCell annotation={row.white} activePly={activePly} onSelectPly={onSelectPly} />
          <MoveListCell annotation={row.black} activePly={activePly} onSelectPly={onSelectPly} />
        </div>
      )) : (
        <div style={sx({ color: "rgba(255,255,255,0.26)", fontSize: "13px", padding: "12px 0" })}>
          Make a move on the board to start a line.
        </div>
      )}
    </div>
  );
}

function BrowserAnalysisPage({ onHome }) {
  const initialSessionRef = useRef(null);
  if (!initialSessionRef.current) {
    initialSessionRef.current = readBrowserAnalysisSession();
  }

  const [rootFen, setRootFen] = useState(initialSessionRef.current.rootFen);
  const [fen, setFen] = useState(initialSessionRef.current.fen);
  const [fenDraft, setFenDraft] = useState(initialSessionRef.current.fen);
  const [moves, setMoves] = useState(initialSessionRef.current.moves);
  const [selectedPly, setSelectedPly] = useState(null);
  const [error, setError] = useState("");
  const [liveEvaluation, setLiveEvaluation] = useState({ fen: "", value: null });
  const [variationStatus, setVariationStatus] = useState("idle");
  const [classificationStatus, setClassificationStatus] = useState("");
  const basePly = useMemo(() => basePlyFromFen(rootFen), [rootFen]);
  const annotations = useMemo(() => moves.map((move, index) => localAnnotationFromMove(move, basePly, index)), [moves, basePly]);
  const activeAnnotation = annotations.find((annotation) => annotation.ply === selectedPly)
    || annotations.at(-1)
    || {
      ply: basePly,
      move_index: Math.max(1, Math.ceil(Math.max(1, basePly) / 2)),
      san: "position",
      fen_before: fen,
      fen_after: fen,
      from_square: "",
      to_square: "",
      classification: "analysis",
      evaluation_before: 0,
      evaluation_after: 0,
      evaluation_loss: 0,
      cp_loss: 0,
      game_phase: "analysis",
    };
  const displayedFen = activeAnnotation.fen_after || fen;
  const displayedMoveCount = Math.max(0, Math.min(moves.length, (activeAnnotation.ply || basePly) - basePly));
  const isLatestPosition = displayedMoveCount === moves.length;
  const liveEvaluationValue = liveEvaluation.fen === displayedFen ? liveEvaluation.value : null;

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(
      BROWSER_ANALYSIS_STORAGE_KEY,
      JSON.stringify({
        rootFen,
        fen,
        moves,
      })
    );
  }, [rootFen, fen, moves]);

  async function classifyMoveAtIndex(index, move, moveNumber) {
    setClassificationStatus(`Classifying ${move.san || move.uci}.`);

    try {
      const result = await getOpeningBookClassification({
        fen: move.fenBefore,
        playedUci: move.uci,
        moveNumber,
      }) || await classifyMoveWithCloudStockfish(move);
      setMoves((current) => current.map((item, itemIndex) => (
        itemIndex === index && item.uci === move.uci && item.fenBefore === move.fenBefore
          ? {
            ...item,
            classification: result.classification,
            classificationStatus: "classified",
            cpLoss: result.cpLoss,
            evaluationBefore: result.evaluationBefore,
            evaluationAfter: result.evaluationAfter,
            bookMove: result.bookMove,
            classifiedAt: result.classifiedAt,
          }
          : item
      )));
      setClassificationStatus(`${move.san || move.uci}: ${formatClassification(result.classification)} / ${(result.cpLoss / 100).toFixed(2)} pawns`);
    } catch (classificationError) {
      setMoves((current) => current.map((item, itemIndex) => (
        itemIndex === index && item.uci === move.uci && item.fenBefore === move.fenBefore
          ? { ...item, classificationStatus: "failed", classificationError: classificationError.message || "classification failed" }
          : item
      )));
      setClassificationStatus(classificationError.message || "Classification failed.");
    }
  }

  function applyMove(move) {
    const moveIndex = moves.length;
    const pendingMove = {
      ...move,
      classification: "analysis",
      classificationStatus: "classifying",
    };

    setMoves((current) => [...current, pendingMove]);
    setFen(move.fenAfter);
    setFenDraft(move.fenAfter);
    setSelectedPly(basePly + moveIndex + 1);
    setLiveEvaluation({ fen: "", value: null });
    setError("");
    classifyMoveAtIndex(moveIndex, pendingMove, pendingMove.moveNumber || Math.ceil((basePly + moveIndex + 1) / 2));
  }

  function handleBoardMove({ from, to }) {
    try {
      const move = buildLocalMove(fen, { from, to });
      applyMove(move);
    } catch (moveError) {
      setError(moveError.message || "Illegal move.");
    }
  }

  function handleLoadFen() {
    try {
      const state = fenParts(fenDraft);
      const nextFen = stateToFen(state);
      setRootFen(nextFen);
      setFen(nextFen);
      setFenDraft(nextFen);
      setMoves([]);
      setSelectedPly(null);
      setLiveEvaluation({ fen: "", value: null });
      setClassificationStatus("");
      setError("");
    } catch (fenError) {
      setError(fenError.message || "Invalid FEN.");
    }
  }

  function handleReset() {
    setRootFen(STARTING_FEN);
    setFen(STARTING_FEN);
    setFenDraft(STARTING_FEN);
    setMoves([]);
    setSelectedPly(null);
    setLiveEvaluation({ fen: "", value: null });
    setClassificationStatus("");
    setError("");
  }

  function handleUndo() {
    setMoves((current) => {
      const nextMoves = current.slice(0, -1);
      const nextFen = nextMoves.at(-1)?.fenAfter || rootFen;
      setFen(nextFen);
      setFenDraft(nextFen);
      setSelectedPly(nextMoves.length ? basePly + nextMoves.length : null);
      setLiveEvaluation({ fen: "", value: null });
      setClassificationStatus("");
      setError("");
      return nextMoves;
    });
  }

  function handleSelectPly(ply) {
    setSelectedPly(ply);
    setLiveEvaluation({ fen: "", value: null });
  }

  function handleEvaluationChange(value, evaluatedFen) {
    const nextEvaluation = Number(value);
    setLiveEvaluation({
      fen: evaluatedFen || displayedFen,
      value: Number.isFinite(nextEvaluation) ? nextEvaluation : null,
    });
  }

  async function handlePlayEngineLine(line, moveIndex) {
    const uciMoves = (line?.pv || []).slice(0, moveIndex + 1);
    if (!uciMoves.length || variationStatus === "loading") return;

    setVariationStatus("loading");
    setError("");

    try {
      let cursorFen = displayedFen;
      const nextMoves = [];

      for (const uci of uciMoves) {
        const move = buildLocalMove(cursorFen, {
          from: uci.slice(0, 2),
          to: uci.slice(2, 4),
          promotion: uci[4] || "q",
        });
        nextMoves.push(move);
        cursorFen = move.fenAfter;
      }

      const pendingMoves = nextMoves.map((move) => ({
        ...move,
        classification: "analysis",
        classificationStatus: "classifying",
      }));

      setMoves((current) => [...current.slice(0, displayedMoveCount), ...pendingMoves]);
      setFen(cursorFen);
      setFenDraft(cursorFen);
      setSelectedPly(basePly + displayedMoveCount + pendingMoves.length);
      setLiveEvaluation({ fen: "", value: null });
      pendingMoves.forEach((move, index) => {
        const ply = basePly + displayedMoveCount + index + 1;
        classifyMoveAtIndex(displayedMoveCount + index, move, move.moveNumber || Math.ceil(ply / 2));
      });
    } catch (lineError) {
      setError(lineError.message || "Unable to play engine line.");
    } finally {
      setVariationStatus("idle");
    }
  }

  return (
    <AppShell view="analysis-board" onHome={onHome}>
      <div
        className="sandbox-layout"
        style={sx({
          maxWidth: "1340px",
          display: "grid",
          gridTemplateColumns: "minmax(300px, 360px) minmax(420px, 620px) minmax(300px, 360px)",
          gap: "28px",
          alignItems: "start",
        })}
      >
        <aside className="sandbox-settings-panel" style={sx({ display: "grid", gap: "22px", borderRight: "1px solid rgba(255,255,255,0.06)", paddingRight: "22px" })}>
          <div>
            <div style={sx({ fontSize: "11px", letterSpacing: ".16em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)", marginBottom: "10px" })}>
              standalone board
            </div>
            <h1 style={sx({ margin: 0, fontSize: "32px", color: "#fff", fontWeight: 200 })}>Analysis board</h1>
          </div>

          <label style={sx({ display: "grid", gap: "9px" })}>
            <span style={sx({ fontSize: "11px", letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" })}>
              FEN
            </span>
            <textarea
              value={fenDraft}
              onChange={(event) => setFenDraft(event.target.value)}
              spellCheck="false"
              rows={4}
              style={sx({
                width: "100%",
                resize: "vertical",
                minHeight: "88px",
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.72)",
                fontSize: "12px",
                lineHeight: 1.45,
                padding: "10px",
                outline: "none",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
              })}
            />
          </label>

          <div style={sx({ display: "flex", gap: "10px", flexWrap: "wrap" })}>
            {[
              ["load", handleLoadFen],
              ["undo", handleUndo],
              ["reset", handleReset],
            ].map(([label, handler]) => (
              <button
                key={label}
                type="button"
                onClick={handler}
                style={sx({
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: label === "load" ? "rgba(255,255,255,0.08)" : "transparent",
                  color: label === "load" ? "#fff" : "rgba(255,255,255,0.46)",
                  cursor: "pointer",
                  fontSize: "12px",
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  fontFamily: "inherit",
                })}
              >
                {label}
              </button>
            ))}
          </div>

          {error ? (
            <div style={sx({ color: "rgba(255,255,255,0.62)", fontSize: "13px", lineHeight: 1.4 })}>{error}</div>
          ) : (
            <div style={sx({ color: "rgba(255,255,255,0.32)", fontSize: "13px", lineHeight: 1.45 })}>
              Frontend only. No import, preprocessing, or server-saved analysis.
            </div>
          )}

          {classificationStatus ? (
            <div style={sx({
              color: "rgba(255,255,255,0.48)",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              paddingTop: "14px",
              fontSize: "13px",
              lineHeight: 1.45,
            })}>
              {classificationStatus}
            </div>
          ) : null}
        </aside>

        <main className="board-column sandbox-board-column" style={sx({ display: "grid", gap: "14px", justifyItems: "stretch" })}>
          <div style={sx({ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "16px" })}>
            <span style={sx({ color: "rgba(255,255,255,0.42)", fontSize: "13px" })}>
              {fenParts(displayedFen).turn === "w" ? "white" : "black"} to move
            </span>
            <span style={sx({ color: "rgba(255,255,255,0.24)", fontSize: "12px", letterSpacing: ".1em", textTransform: "uppercase" })}>
              {moves.length} move{moves.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="board-with-eval" style={sx({ display: "grid", gridTemplateColumns: "minmax(0, 620px) 30px", gap: "8px", alignItems: "stretch" })}>
            <Board
              fen={displayedFen}
              annotation={activeAnnotation}
              maxWidth="620px"
              interactive={isLatestPosition}
              onMove={isLatestPosition ? handleBoardMove : null}
              isMoveBusy={variationStatus === "loading"}
            />
            <CurrentEvalBar annotation={activeAnnotation} evaluationOverride={liveEvaluationValue} />
          </div>
        </main>

        <aside className="sandbox-lines-panel" style={sx({ display: "grid", gap: "18px", borderLeft: "1px solid rgba(255,255,255,0.06)", paddingLeft: "22px" })}>
          <StockfishLinesPanel
            fen={displayedFen}
            onPlayLineMove={handlePlayEngineLine}
            onEvaluationChange={handleEvaluationChange}
            isApplyingVariation={variationStatus === "loading"}
          />

          <div>
            <div style={sx({ fontSize: "11px", letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,0.22)", marginBottom: "10px" })}>
              line
            </div>
            <StandaloneMoveList
              annotations={annotations}
              activePly={activeAnnotation.ply}
              onSelectPly={handleSelectPly}
            />
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

function studyAccountParams(account) {
  return new URLSearchParams({
    provider: account.platform,
    username: account.username,
  });
}

function StudyWorkspacePage({ account, studyId, onBack, onDeleted, onStudyLoaded }) {
  const [study, setStudy] = useState(null);
  const [activeChapterId, setActiveChapterId] = useState("");
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [selectedPly, setSelectedPly] = useState(null);
  const [liveEvaluation, setLiveEvaluation] = useState({ fen: "", value: null });
  const [variationStatus, setVariationStatus] = useState("idle");
  const [classificationStatus, setClassificationStatus] = useState("");
  const [editingChapterId, setEditingChapterId] = useState("");
  const onStudyLoadedRef = useRef(onStudyLoaded);

  const activeChapter = study?.chapters?.find((chapter) => chapter.id === activeChapterId)
    || study?.chapters?.[0]
    || null;
  const rootFen = activeChapter?.root_fen || STARTING_FEN;
  const moves = useMemo(() => activeChapter?.moves || [], [activeChapter?.moves]);
  const basePly = useMemo(() => basePlyFromFen(rootFen), [rootFen]);
  const annotations = useMemo(() => moves.map((move, index) => localAnnotationFromMove(move, basePly, index)), [moves, basePly]);
  const activeAnnotation = annotations.find((annotation) => annotation.ply === selectedPly)
    || annotations.at(-1)
    || {
      ply: basePly,
      move_index: Math.max(1, Math.ceil(Math.max(1, basePly) / 2)),
      san: "position",
      fen_before: rootFen,
      fen_after: rootFen,
      from_square: "",
      to_square: "",
      classification: "analysis",
      evaluation_before: 0,
      evaluation_after: 0,
      evaluation_loss: 0,
      cp_loss: 0,
      game_phase: "study",
    };
  const displayedFen = activeAnnotation.fen_after || rootFen;
  const displayedMoveCount = Math.max(0, Math.min(moves.length, (activeAnnotation.ply || basePly) - basePly));
  const isLatestPosition = displayedMoveCount === moves.length;
  const liveEvaluationValue = liveEvaluation.fen === displayedFen ? liveEvaluation.value : null;

  useEffect(() => {
    onStudyLoadedRef.current = onStudyLoaded;
  }, [onStudyLoaded]);

  function studyUrl(path = "") {
    const params = studyAccountParams(account);
    return apiUrl(`/api/studies/${studyId}${path}?${params.toString()}`);
  }

  useEffect(() => {
    if (!studyId || !account.username || !account.platform) return undefined;

    let isActive = true;

    async function fetchStudy() {
      setStatus("loading");
      setError("");

      try {
        const params = new URLSearchParams({
          provider: account.platform,
          username: account.username,
        });
        const response = await fetch(apiUrl(`/api/studies/${studyId}?${params.toString()}`));
        const payload = await response.json();

        if (!response.ok) throw new Error(payload.error || "unable to load study");
        if (!isActive) return;
        setStudy(payload);
        setActiveChapterId((current) => (
          payload.chapters.some((chapter) => chapter.id === current)
            ? current
            : payload.chapters[0]?.id || ""
        ));
        onStudyLoadedRef.current?.(payload);
        setStatus("idle");
      } catch (loadError) {
        if (!isActive) return;
        setError(loadError.message || "unable to load study");
        setStatus("error");
      }
    }

    fetchStudy();
    return () => {
      isActive = false;
    };
  }, [studyId, account.username, account.platform]);

  async function patchStudyName(name) {
    const response = await fetch(studyUrl(""), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: account.platform,
        username: account.username,
        name,
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "unable to rename study");
    setStudy((current) => current ? { ...current, name: payload.name, updated_at: payload.updated_at } : current);
  }

  async function patchChapter(chapterId, patch) {
    const response = await fetch(studyUrl(`/chapters/${chapterId}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: account.platform,
        username: account.username,
        ...patch,
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "unable to save chapter");
    setStudy((current) => current
      ? {
        ...current,
        updated_at: new Date().toISOString(),
        chapters: current.chapters.map((chapter) => chapter.id === chapterId ? payload : chapter),
      }
      : current);
    return payload;
  }

  async function saveMoves(nextMoves) {
    if (!activeChapter) return;
    await patchChapter(activeChapter.id, { moves: nextMoves });
  }

  async function classifyStudyMoveAtIndex(index, move, moveNumber, baseMoves = moves) {
    setClassificationStatus(`Classifying ${move.san || move.uci}.`);

    try {
      const result = await getOpeningBookClassification({
        fen: move.fenBefore,
        playedUci: move.uci,
        moveNumber,
      }) || await classifyMoveWithCloudStockfish(move);
      const nextMoves = baseMoves.map((item, itemIndex) => (
        itemIndex === index && item.uci === move.uci && item.fenBefore === move.fenBefore
          ? {
            ...item,
            classification: result.classification,
            classificationStatus: "classified",
            cpLoss: result.cpLoss,
            evaluationBefore: result.evaluationBefore,
            evaluationAfter: result.evaluationAfter,
            bookMove: result.bookMove,
            classifiedAt: result.classifiedAt,
          }
          : item
      ));
      await saveMoves(nextMoves);
      setClassificationStatus(`${move.san || move.uci}: ${formatClassification(result.classification)} / ${(result.cpLoss / 100).toFixed(2)} pawns`);
      return nextMoves;
    } catch (classificationError) {
      const nextMoves = baseMoves.map((item, itemIndex) => (
        itemIndex === index && item.uci === move.uci && item.fenBefore === move.fenBefore
          ? { ...item, classificationStatus: "failed", classificationError: classificationError.message || "classification failed" }
          : item
      ));
      await saveMoves(nextMoves);
      setClassificationStatus(classificationError.message || "Classification failed.");
      return nextMoves;
    }
  }

  async function applyStudyMove(move) {
    if (!activeChapter) return;

    const moveIndex = displayedMoveCount;
    const pendingMove = {
      ...move,
      classification: "analysis",
      classificationStatus: "classifying",
    };
    const nextMoves = [...moves.slice(0, displayedMoveCount), pendingMove];

    setError("");
    setSelectedPly(basePly + moveIndex + 1);
    setLiveEvaluation({ fen: "", value: null });
    await saveMoves(nextMoves);
    classifyStudyMoveAtIndex(
      moveIndex,
      pendingMove,
      pendingMove.moveNumber || Math.ceil((basePly + moveIndex + 1) / 2),
      nextMoves
    );
  }

  async function handleBoardMove({ from, to }) {
    try {
      const move = buildLocalMove(displayedFen, { from, to });
      await applyStudyMove(move);
    } catch (moveError) {
      setError(moveError.message || "Illegal move.");
    }
  }

  async function handlePlayEngineLine(line, moveIndex) {
    const uciMoves = (line?.pv || []).slice(0, moveIndex + 1);
    if (!uciMoves.length || variationStatus === "loading") return;

    setVariationStatus("loading");
    setError("");

    try {
      let cursorFen = displayedFen;
      const nextMoves = [];

      for (const uci of uciMoves) {
        const move = buildLocalMove(cursorFen, {
          from: uci.slice(0, 2),
          to: uci.slice(2, 4),
          promotion: uci[4] || "q",
        });
        nextMoves.push({
          ...move,
          classification: "analysis",
          classificationStatus: "classifying",
        });
        cursorFen = move.fenAfter;
      }

      const combinedMoves = [...moves.slice(0, displayedMoveCount), ...nextMoves];
      await saveMoves(combinedMoves);
      setSelectedPly(basePly + displayedMoveCount + nextMoves.length);
      let classifiedMoves = combinedMoves;
      for (let index = 0; index < nextMoves.length; index += 1) {
        const move = nextMoves[index];
        const ply = basePly + displayedMoveCount + index + 1;
        classifiedMoves = await classifyStudyMoveAtIndex(
          displayedMoveCount + index,
          move,
          move.moveNumber || Math.ceil(ply / 2),
          classifiedMoves
        );
      }
    } catch (lineError) {
      setError(lineError.message || "Unable to play engine line.");
    } finally {
      setVariationStatus("idle");
    }
  }

  function handleEvaluationChange(value, evaluatedFen) {
    const nextEvaluation = Number(value);
    setLiveEvaluation({
      fen: evaluatedFen || displayedFen,
      value: Number.isFinite(nextEvaluation) ? nextEvaluation : null,
    });
  }

  const chapterCount = study?.chapters?.length || 0;
  const chapterLimit = 10;

  async function handleAddChapter() {
    if (chapterCount >= chapterLimit) {
      setError(`Studies can have up to ${chapterLimit} chapters.`);
      return;
    }

    try {
      const response = await fetch(studyUrl("/chapters"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: account.platform,
          username: account.username,
          name: `Chapter ${chapterCount + 1}`,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "unable to add chapter");
      setStudy((current) => current ? { ...current, chapters: [...current.chapters, payload] } : current);
      setActiveChapterId(payload.id);
      setSelectedPly(null);
    } catch (chapterError) {
      setError(chapterError.message || "unable to add chapter");
    }
  }

  async function handleDeleteChapter(chapterId) {
    if (!window.confirm("Delete this study chapter?")) return;

    try {
      const params = studyAccountParams(account);
      const response = await fetch(apiUrl(`/api/studies/${studyId}/chapters/${chapterId}?${params.toString()}`), {
        method: "DELETE",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "unable to delete chapter");
      setStudy((current) => {
        if (!current) return current;
        const chapters = current.chapters.filter((chapter) => chapter.id !== chapterId);
        setActiveChapterId(chapters[0]?.id || "");
        setEditingChapterId("");
        return { ...current, chapters };
      });
    } catch (chapterError) {
      setError(chapterError.message || "unable to delete chapter");
    }
  }

  async function handleDeleteStudy() {
    if (!window.confirm("Delete this study permanently?")) return;

    try {
      const params = studyAccountParams(account);
      const response = await fetch(apiUrl(`/api/studies/${studyId}?${params.toString()}`), { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "unable to delete study");
      onDeleted?.();
    } catch (deleteError) {
      setError(deleteError.message || "unable to delete study");
    }
  }

  if (status === "loading" && !study) {
    return (
      <AppShell view="study" onHome={onBack}>
        <div className="study-page study-panel">Loading study.</div>
      </AppShell>
    );
  }

  return (
    <AppShell view="study" onHome={onBack}>
      <div className="study-page">
        <aside className="study-panel study-chapters-panel">
          <div className="study-panel-header">
            <span>Pro study</span>
            <button type="button" onClick={onBack}>dashboard</button>
          </div>
          <input
            className="study-title-input"
            value={study?.name || ""}
            onChange={(event) => setStudy((current) => current ? { ...current, name: event.target.value } : current)}
            onBlur={(event) => patchStudyName(event.target.value).catch((renameError) => setError(renameError.message))}
          />
          <div className="study-chapter-list">
            {(study?.chapters || []).map((chapter, index) => (
              <div
                key={chapter.id}
                className={chapter.id === activeChapter?.id ? "study-chapter is-active" : "study-chapter"}
                role="button"
                tabIndex={0}
                onClick={() => {
                  setActiveChapterId(chapter.id);
                  setSelectedPly(null);
                  setLiveEvaluation({ fen: "", value: null });
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setActiveChapterId(chapter.id);
                    setSelectedPly(null);
                    setLiveEvaluation({ fen: "", value: null });
                  }
                }}
              >
                <span>{index + 1}</span>
                {editingChapterId === chapter.id ? (
                  <input
                    className="study-chapter-name-input"
                    autoFocus
                    value={chapter.name}
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.currentTarget.blur();
                      if (event.key === "Escape") {
                        event.stopPropagation();
                        setEditingChapterId("");
                        fetch(studyUrl(""))
                          .then((response) => response.json())
                          .then((payload) => {
                            if (payload?.chapters) setStudy(payload);
                          })
                          .catch(() => {});
                      }
                    }}
                    onChange={(event) => {
                      const name = event.target.value;
                      setStudy((current) => current
                        ? { ...current, chapters: current.chapters.map((item) => item.id === chapter.id ? { ...item, name } : item) }
                        : current);
                    }}
                    onBlur={(event) => {
                      setEditingChapterId("");
                      patchChapter(chapter.id, { name: event.target.value }).catch((renameError) => setError(renameError.message));
                    }}
                  />
                ) : (
                  <span
                    className="study-chapter-name-display"
                    title="Double-click to rename"
                    onDoubleClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setEditingChapterId(chapter.id);
                    }}
                  >
                    {chapter.name}
                  </span>
                )}
                <small>{(chapter.moves || []).length} moves</small>
              </div>
            ))}
          </div>
          <div className="study-panel-actions">
            <button
              type="button"
              disabled={chapterCount >= chapterLimit}
              title={chapterCount >= chapterLimit ? `${chapterLimit} chapter limit reached` : ""}
              onClick={handleAddChapter}
            >
              add chapter ({chapterCount}/{chapterLimit})
            </button>
            <button type="button" disabled={!activeChapter || (study?.chapters?.length || 0) <= 1} onClick={() => handleDeleteChapter(activeChapter.id)}>delete chapter</button>
            <button type="button" onClick={handleDeleteStudy}>delete study</button>
          </div>
          {error ? <p className="study-error">{error}</p> : null}
          {classificationStatus ? <p className="study-status">{classificationStatus}</p> : null}
        </aside>

        <main className="study-board-column">
          <div className="study-board-meta">
            <span>{activeChapter?.name || "Chapter"}</span>
            <span>{fenParts(displayedFen).turn === "w" ? "White" : "Black"} to move</span>
          </div>
          <div className="board-with-eval study-board-wrap">
            <Board
              fen={displayedFen}
              annotation={activeAnnotation}
              maxWidth="680px"
              interactive={isLatestPosition && variationStatus !== "loading"}
              onMove={isLatestPosition ? handleBoardMove : null}
              isMoveBusy={variationStatus === "loading"}
            />
            <CurrentEvalBar annotation={activeAnnotation} evaluationOverride={liveEvaluationValue} />
          </div>
        </main>

        <aside className="study-panel study-lines-panel">
          <StockfishLinesPanel
            fen={displayedFen}
            onPlayLineMove={handlePlayEngineLine}
            onEvaluationChange={handleEvaluationChange}
            isApplyingVariation={variationStatus === "loading"}
          />
          <div>
            <div className="study-section-label">moves and annotations</div>
            <StandaloneMoveList
              annotations={annotations}
              activePly={activeAnnotation.ply}
              onSelectPly={(ply) => {
                setSelectedPly(ply);
                setLiveEvaluation({ fen: "", value: null });
              }}
            />
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

function StudiesDashboardSection({
  account,
  studies,
  loading,
  error,
  onCreate,
  onOpen,
  onRename,
  onDelete,
  onUpgrade,
}) {
  const [collapsed, setCollapsed] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newStudyName, setNewStudyName] = useState("Untitled study");
  const [editingStudyId, setEditingStudyId] = useState("");
  const [editingStudyName, setEditingStudyName] = useState("");
  const canCreateStudy = account.isPremium || studies.length < 1;

  function startCreate() {
    if (!canCreateStudy) {
      onUpgrade();
      return;
    }

    setCollapsed(false);
    setCreating(true);
    setNewStudyName("Untitled study");
  }

  function submitCreate() {
    const name = newStudyName.trim();
    if (!name) return;
    setCreating(false);
    onCreate(name);
  }

  function startRename(study) {
    setEditingStudyId(study.id);
    setEditingStudyName(study.name);
  }

  function submitRename(studyId) {
    const name = editingStudyName.trim();
    setEditingStudyId("");
    if (name) onRename(studyId, name);
  }

  return (
    <section
      className={collapsed ? "dashboard-studies is-collapsed" : "dashboard-studies"}
      role={collapsed ? "button" : undefined}
      tabIndex={collapsed ? 0 : undefined}
      onClick={(event) => {
        if (!collapsed) return;
        if (event.target.closest("button, input, a")) return;
        setCollapsed(false);
      }}
      onKeyDown={(event) => {
        if (!collapsed || !["Enter", " "].includes(event.key)) return;
        event.preventDefault();
        setCollapsed(false);
      }}
    >
      <div className="dashboard-studies-header">
        <div className="dashboard-studies-toggle" onClick={() => setCollapsed((current) => !current)}>
          <span>{account.isPremium ? "Pro workspace" : "Study workspace"}</span>
          <h2>Studies</h2>
          <small>{studies.length} saved · {collapsed ? "expand" : "collapse"}</small>
        </div>
        {canCreateStudy ? (
          <button type="button" className="study-create-button" onClick={startCreate}>new study</button>
        ) : (
          <button type="button" className="study-create-button" onClick={onUpgrade}>upgrade for more</button>
        )}
      </div>

      {!collapsed && creating ? (
        <div className="dashboard-study-create">
          <input
            autoFocus
            value={newStudyName}
            onChange={(event) => setNewStudyName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submitCreate();
              if (event.key === "Escape") setCreating(false);
            }}
            aria-label="New study name"
          />
          <button type="button" onClick={submitCreate}>create</button>
          <button type="button" onClick={() => setCreating(false)}>cancel</button>
        </div>
      ) : null}

      {!collapsed && error ? (
        <div className="dashboard-study-gate">{error}</div>
      ) : !collapsed && loading ? (
        <div className="dashboard-study-gate">Loading studies.</div>
      ) : !collapsed && studies.length ? (
        <div className="dashboard-study-grid">
          {studies.map((study) => (
            <article
              key={study.id}
              className="dashboard-study-card"
            >
              <div className="dashboard-study-open">
                {editingStudyId === study.id ? (
                  <input
                    className="dashboard-study-name-input"
                    autoFocus
                    value={editingStudyName}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => setEditingStudyName(event.target.value)}
                    onBlur={() => submitRename(study.id)}
                    onKeyDown={(event) => {
                      event.stopPropagation();
                      if (event.key === "Enter") event.currentTarget.blur();
                      if (event.key === "Escape") setEditingStudyId("");
                    }}
                  />
                ) : (
                  <strong
                    className="dashboard-study-name-display"
                    title="Double-click to rename"
                    onDoubleClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      startRename(study);
                    }}
                  >
                    {study.name}
                  </strong>
                )}
                <span className="dashboard-study-info">
                  {study.chapter_count} chapter{study.chapter_count === 1 ? "" : "s"} / {study.move_count} moves
                </span>
                <small className="dashboard-study-updated">Updated {formatPlayedDate(study.updated_at)}</small>
              </div>
              <div className="dashboard-study-actions">
                <button type="button" onClick={() => onOpen(study.id)}>open study</button>
                <button type="button" onClick={() => onDelete(study.id)}>delete</button>
              </div>
            </article>
          ))}
        </div>
      ) : !collapsed ? (
        <div className="dashboard-study-gate">No studies yet. Create one to start a saved analysis workspace.</div>
      ) : null}

      {!collapsed && !account.isPremium ? (
        <div className="dashboard-study-limit">
          Free accounts include one study. Upgrade to Pro for unlimited studies.
        </div>
      ) : null}
    </section>
  );
}

function AnalysisPage({ game, selectedPly, onSelectPly, onHome }) {
  const [linePreview, setLinePreview] = useState(null);
  const [summaryBoardFocus, setSummaryBoardFocus] = useState(null);
  const [variationLines, setVariationLines] = useState([]);
  const [activeVariationCursor, setActiveVariationCursor] = useState(null);
  const [variationStatus, setVariationStatus] = useState("idle");
  const [variationError, setVariationError] = useState("");
  const [liveEvaluation, setLiveEvaluation] = useState(null);
  const currentAnnotation =
    game.annotations.find((annotation) => annotation.ply === selectedPly) || game.annotations[0];
  const actualBoardFen = currentAnnotation?.fen_after || currentAnnotation?.fen_before || game.annotations[0]?.fen_before;
  const activeVariationLine = activeVariationCursor
    ? findVariationLine(variationLines, activeVariationCursor.lineId)
    : null;
  const activeVariationMove = activeVariationLine?.moves[activeVariationCursor?.moveIndex] || null;
  const activeVariationAnnotation = activeVariationMove
    ? variationAnnotationFromMove(activeVariationMove, activeVariationLine.basePly, activeVariationCursor.moveIndex)
    : null;
  const activeAnalysisFen = activeVariationMove?.fenAfter || actualBoardFen;
  const boardFen = linePreview?.fen || activeAnalysisFen;
  const displayedBoardFen = summaryBoardFocus?.fen || boardFen;
  const displayedAnnotation = summaryBoardFocus
    ? summaryBoardFocus.annotation
    : linePreview?.annotation || activeVariationAnnotation || currentAnnotation;
  const displayedEvaluationOverride = !summaryBoardFocus && liveEvaluation !== null ? liveEvaluation : null;
  const moveRows = groupAnnotationsByMove(game.annotations);
  const currentClassification = visualClassification(currentAnnotation);

  function clearVariationSelection() {
    setActiveVariationCursor(null);
    setVariationStatus("idle");
    setVariationError("");
    setLiveEvaluation(null);
  }

  function handleSelectPly(ply) {
    setLinePreview(null);
    setSummaryBoardFocus(null);
    clearVariationSelection();
    onSelectPly(ply);
  }

  async function requestAnalysisMove(body) {
    const response = await fetch(apiUrl("/api/analysis/move"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const payload = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(payload.error || "move is illegal");
    }

    return payload;
  }

  async function classifyVariationMoveAtIndex(lineId, moveIndex, move) {
    try {
      const result = await classifyMoveWithCloudStockfish(move);
      setVariationLines((current) => updateVariationMove(current, lineId, moveIndex, (item) => (
        item.uci === move.uci && item.fenBefore === move.fenBefore
          ? {
            ...item,
            classification: result.classification,
            classificationStatus: "classified",
            cpLoss: result.cpLoss,
            evaluationBefore: result.evaluationBefore,
            evaluationAfter: result.evaluationAfter,
            classifiedAt: result.classifiedAt,
          }
          : item
      )));
    } catch (error) {
      setVariationLines((current) => updateVariationMove(current, lineId, moveIndex, (item) => (
        item.uci === move.uci && item.fenBefore === move.fenBefore
          ? { ...item, classificationStatus: "failed", classificationError: error.message || "classification failed" }
          : item
      )));
    }
  }

  function selectVariationMove(lineId, moveIndex) {
    setLinePreview(null);
    setSummaryBoardFocus(null);
    setActiveVariationCursor({ lineId, moveIndex });
    setVariationError("");
    setLiveEvaluation(null);
  }

  async function handleBoardMove({ from, to }) {
    if (!activeAnalysisFen || variationStatus === "loading") return;

    setVariationStatus("loading");
    setVariationError("");
    setLiveEvaluation(null);
    setSummaryBoardFocus(null);
    setLinePreview(null);

    try {
      const move = await requestAnalysisMove({ fen: activeAnalysisFen, from, to });
      const pendingMove = {
        ...move,
        id: analysisMoveId("user"),
        source: "board",
        classification: "analysis",
        classificationStatus: "classifying",
      };

      if (!activeVariationCursor) {
        const nextMainline = game.annotations.find((annotation) => annotation.ply === currentAnnotation.ply + 1);
        if (nextMainline && annotationUci(nextMainline) === annotationUci(move)) {
          handleSelectPly(nextMainline.ply);
          return;
        }
      } else {
        const expectedMove = activeVariationLine?.moves[activeVariationCursor.moveIndex + 1];
        if (expectedMove && annotationUci(expectedMove) === annotationUci(move)) {
          selectVariationMove(activeVariationLine.id, activeVariationCursor.moveIndex + 1);
          return;
        }
      }

      const parentKey = activeVariationMove
        ? variationParentKeyForMove(activeVariationMove.id)
        : variationParentKeyForMainline(currentAnnotation.ply);
      const existingLine = childVariationLines(variationLines, parentKey)
        .find((line) => annotationUci(line.moves[0]) === annotationUci(move));

      if (existingLine) {
        selectVariationMove(existingLine.id, 0);
        return;
      }

      const canContinueActiveLine = activeVariationLine
        && activeVariationCursor.moveIndex === activeVariationLine.moves.length - 1;
      const lineId = canContinueActiveLine ? activeVariationLine.id : analysisMoveId("line");
      const moveIndex = canContinueActiveLine ? activeVariationLine.moves.length : 0;

      if (canContinueActiveLine) {
        setVariationLines((current) => current.map((line) => (
          line.id === lineId ? { ...line, moves: [...line.moves, pendingMove] } : line
        )));
      } else {
        setVariationLines((current) => [
          ...current,
          {
            id: lineId,
            parentKey,
            basePly: activeVariationAnnotation?.ply || currentAnnotation.ply,
            source: "board",
            moves: [pendingMove],
          },
        ]);
      }

      setActiveVariationCursor({ lineId, moveIndex });
      classifyVariationMoveAtIndex(lineId, moveIndex, pendingMove);
    } catch (error) {
      setVariationError(error.message || "move is illegal");
    } finally {
      setVariationStatus("idle");
    }
  }

  async function handlePreviewLine(line, moveIndex) {
    const uciMoves = (line?.pv || []).slice(0, moveIndex + 1);
    if (!uciMoves.length || !activeAnalysisFen || variationStatus === "loading") return;

    setVariationError("");

    try {
      let cursorFen = activeAnalysisFen;
      let previewMove = null;

      for (const uci of uciMoves) {
        previewMove = await requestAnalysisMove({ fen: cursorFen, uci });
        cursorFen = previewMove.fenAfter;
      }

      if (previewMove) {
        setLinePreview({
          fen: previewMove.fenAfter,
          annotation: variationAnnotationFromMove(
            { ...previewMove, classification: "analysis" },
            activeVariationAnnotation?.ply || currentAnnotation.ply,
            uciMoves.length - 1
          ),
        });
      }
    } catch (error) {
      setVariationError(error.message || "unable to preview engine line");
    }
  }

  async function handlePlayLineMove(line, moveIndex) {
    const uciMoves = (line?.pv || []).slice(0, moveIndex + 1);
    if (!uciMoves.length || !activeAnalysisFen || variationStatus === "loading") return;

    setVariationStatus("loading");
    setVariationError("");
    setLiveEvaluation(null);
    setSummaryBoardFocus(null);
    setLinePreview(null);

    try {
      let cursorFen = activeAnalysisFen;
      const nextMoves = [];

      for (const uci of uciMoves) {
        const move = await requestAnalysisMove({ fen: cursorFen, uci });
        nextMoves.push({
          ...move,
          id: analysisMoveId("engine"),
          source: "engine",
          classification: "analysis",
          classificationStatus: "classifying",
        });
        cursorFen = move.fenAfter;
      }

      const parentKey = activeVariationMove
        ? variationParentKeyForMove(activeVariationMove.id)
        : variationParentKeyForMainline(currentAnnotation.ply);
      const lineId = analysisMoveId("line");
      const basePly = activeVariationAnnotation?.ply || currentAnnotation.ply;

      setVariationLines((current) => [
        ...current,
        { id: lineId, parentKey, basePly, source: "engine", moves: nextMoves },
      ]);
      setActiveVariationCursor({ lineId, moveIndex: nextMoves.length - 1 });
      nextMoves.forEach((move, index) => {
        classifyVariationMoveAtIndex(lineId, index, move);
      });
    } catch (error) {
      setVariationError(error.message || "unable to play engine line");
    } finally {
      setVariationStatus("idle");
    }
  }

  function handleDeleteVariationLine(lineId) {
    setVariationLines((current) => removeVariationLineTree(current, lineId));
    if (activeVariationCursor?.lineId === lineId) setActiveVariationCursor(null);
    setVariationError("");
    setLiveEvaluation(null);
  }

  function handleEvaluationChange(value) {
    if (value === null || value === undefined) {
      setLiveEvaluation(null);
      return;
    }

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

      if (isTypingTarget) return;

      if (event.key === "Delete" && activeVariationCursor) {
        event.preventDefault();
        if (window.confirm("Delete this variation and its sub-variations?")) {
          setVariationLines((current) => removeVariationLineTree(current, activeVariationCursor.lineId));
          setActiveVariationCursor(null);
          setVariationError("");
          setLiveEvaluation(null);
        }
        return;
      }

      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;

      if (activeVariationLine && activeVariationCursor) {
        const direction = ["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1;
        const nextMoveIndex = activeVariationCursor.moveIndex + direction;

        if (nextMoveIndex >= 0 && nextMoveIndex < activeVariationLine.moves.length) {
          event.preventDefault();
          selectVariationMove(activeVariationLine.id, nextMoveIndex);
          return;
        }
      }

      const currentIndex = game.annotations.findIndex((annotation) => annotation.ply === currentAnnotation.ply);
      const nextIndex = ["ArrowRight", "ArrowDown"].includes(event.key)
        ? Math.min(game.annotations.length - 1, currentIndex + 1)
        : Math.max(0, currentIndex - 1);
      const nextAnnotation = game.annotations[nextIndex];

      if (!nextAnnotation || nextAnnotation.ply === currentAnnotation.ply) return;

      event.preventDefault();
      setLinePreview(null);
      setSummaryBoardFocus(null);
      setActiveVariationCursor(null);
      setVariationStatus("idle");
      setVariationError("");
      setLiveEvaluation(null);
      onSelectPly(nextAnnotation.ply);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeVariationCursor, activeVariationLine, currentAnnotation.ply, game.annotations, onSelectPly]);

  return (
    <AppShell view="analysis" onHome={onHome}>
      <div
        className="analysis-layout analysis-layout-focus"
        style={sx({
          maxWidth: "1540px",
          display: "grid",
          gridTemplateColumns: "390px minmax(420px, 620px) minmax(280px, 360px)",
          gap: "28px",
          alignItems: "start",
        })}
      >
        <div className="board-column analysis-board-column" style={sx({ display: "flex", flexDirection: "column", gap: "12px" })}>
          <div className="analysis-current-move is-temporarily-hidden">
            <div>
              <span>Current move</span>
              <strong>{currentAnnotation ? formatMoveLabel(currentAnnotation) : "--"}</strong>
            </div>
            <div className={`analysis-classification is-${currentClassification}`}>
              {formatClassification(currentClassification)}
              <span>{formatCpLoss(currentAnnotation)} pawns</span>
              <span>{currentAnnotation?.game_phase || "analysis"}</span>
            </div>
          </div>

          <div
            className="board-with-eval"
            style={sx({
              display: "grid",
              gridTemplateColumns: "minmax(0, 860px) 30px",
              gap: "8px",
              alignItems: "stretch",
              maxWidth: "898px",
            })}
          >
            <Board
              key={game.id || "analysis-board"}
              fen={displayedBoardFen}
              annotation={displayedAnnotation}
              isExploringLine={Boolean(linePreview || summaryBoardFocus || activeVariationMove)}
              maxWidth="860px"
              interactive={!summaryBoardFocus && !linePreview}
              onMove={summaryBoardFocus || linePreview ? null : handleBoardMove}
              isMoveBusy={variationStatus === "loading"}
              showMoveBadge={!linePreview && !summaryBoardFocus}
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
          className="analysis-panel analysis-right-panel analysis-move-list"
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
            fen={activeAnalysisFen}
            moveRows={moveRows}
            variationLines={variationLines}
            activeVariationCursor={activeVariationCursor}
            variationStatus={variationStatus}
            variationError={variationError}
            onSelectPly={handleSelectPly}
            onSelectVariationMove={selectVariationMove}
            onPreviewLine={handlePreviewLine}
            onPlayLineMove={handlePlayLineMove}
            onDeleteVariationLine={handleDeleteVariationLine}
            onEvaluationChange={handleEvaluationChange}
          />
        </div>
      </div>
    </AppShell>
  );
}

export default function App() {
  const [account, setAccount] = useState(readStoredAccount);
  const [view, setView] = useState(() => initialViewForAccount(readStoredAccount()));
  const [dashboard, setDashboard] = useState(createEmptyDashboard);
  const [collapsedSections, setCollapsedSections] = useState(createCollapsedSections);
  const [dashboardSummary, setDashboardSummary] = useState(createDashboardSummary);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState("");
  const [dashboardReloadKey, setDashboardReloadKey] = useState(0);
  const [latestGame, setLatestGame] = useState(null);
  const [selectedPly, setSelectedPly] = useState(null);
  const [billingNotice, setBillingNotice] = useState("");
  const [boardThemeId, setBoardThemeId] = useState(readStoredBoardTheme);
  const [pieceSetId, setPieceSetId] = useState(readStoredPieceSet);
  const [studies, setStudies] = useState([]);
  const [studiesLoading, setStudiesLoading] = useState(false);
  const [studiesError, setStudiesError] = useState("");
  const [selectedStudyId, setSelectedStudyId] = useState(initialStudyIdFromLocation);
  const [selectedProfile, setSelectedProfile] = useState(profileFromLocation);

  function handleBoardThemeChange(themeId) {
    const nextThemeId = boardThemeById(themeId).id;
    setBoardThemeId(nextThemeId);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(BOARD_THEME_STORAGE_KEY, nextThemeId);
    }
  }

  function handlePieceSetChange(nextPieceSetId) {
    const resolvedPieceSetId = pieceSetById(nextPieceSetId).id;
    setPieceSetId(resolvedPieceSetId);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(PIECE_SET_STORAGE_KEY, resolvedPieceSetId);
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!account.username || !account.platform) {
      window.localStorage.removeItem(ACCOUNT_STORAGE_KEY);
      window.dispatchEvent(new CustomEvent(ACCOUNT_UPDATED_EVENT));
      return;
    }

    window.localStorage.setItem(
      ACCOUNT_STORAGE_KEY,
      JSON.stringify(storedAccountPayload(account))
    );
    window.dispatchEvent(new CustomEvent(ACCOUNT_UPDATED_EVENT));
  }, [account]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleLandingNavigation = () => {
      setView("landing");
    };
    const handleUpgradeNavigation = () => {
      setView(readStoredAccount().username ? "upgrade" : "signup");
    };
    const handleProfileSettingsNavigation = () => {
      if (readStoredAccount().username) setView("profile-settings");
    };
    const handlePopState = () => {
      setSelectedStudyId(initialStudyIdFromLocation());
      setSelectedProfile(profileFromLocation());
      setView(initialViewForAccount(readStoredAccount()));
    };

    window.addEventListener(LANDING_NAVIGATION_EVENT, handleLandingNavigation);
    window.addEventListener(UPGRADE_NAVIGATION_EVENT, handleUpgradeNavigation);
    window.addEventListener(PROFILE_SETTINGS_NAVIGATION_EVENT, handleProfileSettingsNavigation);
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener(LANDING_NAVIGATION_EVENT, handleLandingNavigation);
      window.removeEventListener(UPGRADE_NAVIGATION_EVENT, handleUpgradeNavigation);
      window.removeEventListener(PROFILE_SETTINGS_NAVIGATION_EVENT, handleProfileSettingsNavigation);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const nextPath = pathForView(view, selectedStudyId, selectedProfile);
    const nextUrl = `${nextPath}${window.location.search}${window.location.hash}`;

    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextUrl);
    }
  }, [view, selectedStudyId, selectedProfile]);

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
    setStudies([]);
    setStudiesError("");
    setStudiesLoading(false);
    setSelectedStudyId("");
    setSelectedProfile(null);
    setDashboardReloadKey((current) => current + 1);
    setView("landing");
  }

  function homeView() {
    return account.username ? "dash" : "landing";
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
          avatarPreset: payload.avatar_preset || "white-knight",
          avatarDataUrl: payload.avatar_data_url || "",
          profileSlug: payload.profile_slug || payload.username,
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
    if (view !== "dash" || !["completed", "failed"].includes(account.importStatus)) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setDashboardReloadKey((current) => current + 1);
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [view, account.importStatus]);

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

  useEffect(() => {
    if (view !== "dash" || !account.username || !account.platform) return undefined;

    let isActive = true;

    async function loadStudies() {
      setStudiesLoading(true);
      setStudiesError("");

      try {
        const params = new URLSearchParams({
          provider: account.platform,
          username: account.username,
        });
        const response = await fetch(apiUrl(`/api/studies?${params.toString()}`));
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(
            response.status >= 500
              ? "Studies are temporarily unavailable."
              : payload.error || "unable to load studies"
          );
        }
        if (isActive) setStudies(payload.studies || []);
      } catch (loadError) {
        if (isActive) setStudiesError(loadError.message || "unable to load studies");
      } finally {
        if (isActive) setStudiesLoading(false);
      }
    }

    loadStudies();

    return () => {
      isActive = false;
    };
  }, [view, account.username, account.platform]);

  async function createStudy(name) {
    try {
      setStudiesError("");
      const response = await fetch(apiUrl("/api/studies"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: account.platform,
          username: account.username,
          name: name.trim() || "Untitled study",
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "unable to create study");
      setStudies((current) => [payload, ...current]);
      setSelectedStudyId(payload.id);
      setView("study");
    } catch (createError) {
      setStudiesError(createError.message || "unable to create study");
    }
  }

  function openStudy(studyId) {
    setSelectedStudyId(studyId);
    setView("study");
  }

  async function renameStudy(studyId, name) {
    try {
      const response = await fetch(apiUrl(`/api/studies/${studyId}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: account.platform,
          username: account.username,
          name,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "unable to rename study");
      setStudies((current) => current.map((study) => (
        study.id === studyId ? { ...study, name: payload.name, updated_at: payload.updated_at } : study
      )));
    } catch (renameError) {
      setStudiesError(renameError.message || "unable to rename study");
    }
  }

  async function deleteStudy(studyId) {
    if (!window.confirm("Delete this study permanently?")) return;

    try {
      const params = studyAccountParams(account);
      const response = await fetch(apiUrl(`/api/studies/${studyId}?${params.toString()}`), { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "unable to delete study");
      setStudies((current) => current.filter((study) => study.id !== studyId));
    } catch (deleteError) {
      setStudiesError(deleteError.message || "unable to delete study");
    }
  }

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

  if (view === "profile" && selectedProfile) {
    return (
      <ProfilePage
        profileIdentity={selectedProfile}
        onBack={() => setView(homeView())}
      />
    );
  }

  if (view === "landing") {
    return (
      <LandingPage
        account={account}
        onSignUp={() => setView("signup")}
        onLogin={() => setView("login")}
        onDashboard={() => setView("dash")}
        onAnalysis={() => setView("sandbox")}
        onAccount={() => setView("account")}
        onUpgrade={() => setView("upgrade")}
      />
    );
  }

  if (view === "sandbox") {
    return (
      <BrowserAnalysisPage
        onHome={() => setView(homeView())}
      />
    );
  }

  if (view === "dev") {
    return (
      <DevResetPage
        onHome={() => setView(homeView())}
        onResetComplete={() => {
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
        }}
      />
    );
  }

  if (view === "signup") {
    return (
      <SignUpPage
        onBack={() => setView(homeView())}
        onRegistered={(user) => {
          const nextAccount = {
            ...createEmptyAccount(),
            email: user.email ?? "",
            username: user.username,
            platform: user.provider,
            isPremium: !!user.is_premium,
            avatarPreset: user.avatar_preset || "white-knight",
            avatarDataUrl: user.avatar_data_url || "",
            profileSlug: user.profile_slug || user.username,
            badges: user.badges || [],
          };

          setAccount(nextAccount);
          setCollapsedSections(createCollapsedSections());
          setDashboardReloadKey((current) => current + 1);
          setView("dash");

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
          setDashboardReloadKey((current) => current + 1);
          setView("dash");
        }}
      />
    );
  }

  if (view === "login") {
    return (
      <LoginPage
        onBack={() => setView(homeView())}
        onLoggedIn={(user) => {
          setAccount({
            ...createEmptyAccount(),
            email: user.email ?? "",
            username: user.username,
            platform: user.provider,
            isPremium: !!user.is_premium,
            avatarPreset: user.avatar_preset || "white-knight",
            avatarDataUrl: user.avatar_data_url || "",
            profileSlug: user.profile_slug || user.username,
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
          setView(homeView());
        }}
      />
    );
  }

  if (view === "account") {
    return (
      <AccountPage
        account={account}
        summary={dashboardSummary}
        onBack={() => setView(homeView())}
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

  if (view === "settings" && account.username) {
    return (
      <SettingsPage
        boardThemeId={boardThemeId}
        onBoardThemeChange={handleBoardThemeChange}
        pieceSetId={pieceSetId}
        onPieceSetChange={handlePieceSetChange}
        onBack={() => setView(homeView())}
      />
    );
  }

  if (view === "profile-settings" && account.username) {
    return (
      <ProfileSettingsPage
        account={account}
        onAccountChange={(patch) => setAccount((current) => ({ ...current, ...patch }))}
        onOpenProfile={() => {
          setSelectedProfile({ slug: account.profileSlug || account.username });
          setView("profile");
        }}
        onBack={() => setView(homeView())}
      />
    );
  }

  if (view === "study" && account.username && selectedStudyId) {
    return (
      <StudyWorkspacePage
        account={account}
        studyId={selectedStudyId}
        onBack={() => {
          setSelectedStudyId("");
          setView("dash");
        }}
        onDeleted={() => {
          setStudies((current) => current.filter((study) => study.id !== selectedStudyId));
          setSelectedStudyId("");
          setView("dash");
        }}
        onStudyLoaded={(loadedStudy) => {
          setStudies((current) => {
            const summary = {
              id: loadedStudy.id,
              user_id: loadedStudy.user_id,
              name: loadedStudy.name,
              created_at: loadedStudy.created_at,
              updated_at: loadedStudy.updated_at,
              chapter_count: loadedStudy.chapters?.length || 0,
              move_count: (loadedStudy.chapters || []).reduce((total, chapter) => total + (chapter.moves?.length || 0), 0),
            };
            return current.some((study) => study.id === loadedStudy.id)
              ? current.map((study) => study.id === loadedStudy.id ? { ...study, ...summary } : study)
              : [summary, ...current];
          });
        }}
      />
    );
  }

  if (view === "upgrade") {
    return (
      <UpgradePage
        account={account}
        onBack={() => setView(homeView())}
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
        onBack={() => setView(homeView())}
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
      />
    );
  }

  if (!account.username) {
    return (
      <LandingPage
        account={account}
        onSignUp={() => setView("signup")}
        onLogin={() => setView("login")}
        onDashboard={() => setView("dash")}
        onAnalysis={() => setView("sandbox")}
        onAccount={() => setView("account")}
        onUpgrade={() => setView("upgrade")}
      />
    );
  }

  const issueCount = Object.values(dashboard).flat().length;
  const hasAnyData = issueCount > 0;
  const queuedGames = summaryValue(dashboardSummary, "queuedGames", "queued_games");
  const runningGames = summaryValue(dashboardSummary, "runningGames", "running_games");

  return (
    <AppShell
      view="dash"
      account={account}
      onAccount={() => setView("account")}
      onBack={() => setView("dash")}
      onHome={() => setView(homeView())}
      onLogout={handleLogout}
      headerActions={(
        <DashboardWorkspaceNav
          account={account}
          onSignUp={() => setView("signup")}
          onLogin={() => setView("login")}
          onAccount={() => setView("account")}
          onImport={() => setView("import")}
          onSettings={() => setView("settings")}
          onUpgrade={() => setView("upgrade")}
          onLogout={handleLogout}
        />
      )}
    >
      <div
        className="dashboard-layout"
        style={sx({
          maxWidth: "1240px",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          gap: "30px",
          alignItems: "start",
        })}
      >
        <main className="dashboard-main" style={sx({ minWidth: 0 })}>
          <div
            className="dashboard-heading"
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
                Latest analysis
              </div>
              <p className="dashboard-subheading">
                Your reviewed games, grouped by where the critical decision happened.
              </p>
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

          <div className="dashboard-metrics">
            <RailMetric
              label="Games loaded"
              value={summaryValue(dashboardSummary, "totalGames", "total_games")}
            />
            <RailMetric
              label="Analysis complete"
              value={dashboardLoading ? "Refreshing" : summaryValue(dashboardSummary, "analyzedGames", "analyzed_games")}
            />
            <RailMetric label="Queue active" value={queuedGames + runningGames} />
            <RailMetric label="Listed games" value={issueCount} />
          </div>

          <StudiesDashboardSection
            account={account}
            studies={studies}
            loading={studiesLoading}
            error={studiesError}
            onCreate={createStudy}
            onOpen={openStudy}
            onRename={renameStudy}
            onDelete={deleteStudy}
            onUpgrade={() => setView("upgrade")}
          />

          <div className="dashboard-sections" style={styles.sections}>
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
