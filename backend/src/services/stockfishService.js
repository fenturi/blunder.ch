import { spawn } from "node:child_process";
import readline from "node:readline";
import { config } from "../config.js";

function normalizeScore(line) {
  const mateMatch = line.match(/score mate (-?\d+)/);

  if (mateMatch) {
    const mate = Number(mateMatch[1]);
    return mate > 0 ? 10000 - mate : -10000 - mate;
  }

  const cpMatch = line.match(/score cp (-?\d+)/);
  return cpMatch ? Number(cpMatch[1]) : 0;
}

function parseMate(line) {
  const mateMatch = line.match(/score mate (-?\d+)/);
  return mateMatch ? Number(mateMatch[1]) : null;
}

function parsePv(line) {
  const pvMatch = line.match(/\spv\s(.+)$/);
  return pvMatch ? pvMatch[1].trim().split(/\s+/).filter(Boolean) : [];
}

function parseMultiPv(line) {
  const multiPvMatch = line.match(/\bmultipv\s+(\d+)/);
  return multiPvMatch ? Number(multiPvMatch[1]) : 1;
}

function parseDepth(line) {
  const depthMatch = line.match(/\bdepth\s+(\d+)/);
  return depthMatch ? Number(depthMatch[1]) : 0;
}

function onceLine(stream, predicate, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Stockfish response timed out"));
    }, timeoutMs);

    const onLine = (line) => {
      if (!predicate(line)) return;
      cleanup();
      resolve(line);
    };

    const cleanup = () => {
      clearTimeout(timer);
      stream.off("line", onLine);
    };

    stream.on("line", onLine);
  });
}

function parseEvaluation(infoLines, bestMoveLine) {
  const bestMove = bestMoveLine.split(" ")[1] ?? "";
  const latestLineByPv = new Map();

  for (const line of infoLines) {
    if (!line.includes(" score ")) continue;
    latestLineByPv.set(parseMultiPv(line), line);
  }

  const lines = [...latestLineByPv.entries()]
    .sort(([left], [right]) => left - right)
    .map(([multipv, line]) => {
      const pv = parsePv(line);

      return {
        multipv,
        move: pv[0] || "",
        pv,
        evaluation: normalizeScore(line),
        mate: parseMate(line),
        depth: parseDepth(line),
      };
    });
  const bestLine = lines[0];

  return {
    bestMove,
    lines,
    evaluation: bestLine?.evaluation ?? 0,
    mate: bestLine?.mate ?? null,
    depth: bestLine?.depth ?? 0,
  };
}

export async function createStockfishSession({ multiPv = 1, depth = config.engineDepth } = {}) {
  const engine = spawn(config.stockfishPath, [], { stdio: ["pipe", "pipe", "ignore"] });
  const reader = readline.createInterface({ input: engine.stdout });
  const boundedMultiPv = Math.max(1, Math.min(5, Number(multiPv) || 1));
  const boundedDepth = Math.max(1, Math.min(24, Number(depth) || config.engineDepth));

  engine.stdin.write("uci\n");
  await onceLine(reader, (line) => line === "uciok");
  engine.stdin.write(`setoption name MultiPV value ${boundedMultiPv}\n`);
  engine.stdin.write("isready\n");
  await onceLine(reader, (line) => line === "readyok");

  return {
    async evaluate(fen) {
      const infoLines = [];
      const collect = (line) => {
        if (line.startsWith("info depth")) {
          infoLines.push(line);
        }
      };

      reader.on("line", collect);
      try {
        engine.stdin.write(`position fen ${fen}\n`);
        engine.stdin.write(`go depth ${boundedDepth}\n`);
        const bestMoveLine = await onceLine(reader, (line) => line.startsWith("bestmove "));
        return parseEvaluation(infoLines, bestMoveLine);
      } finally {
        reader.off("line", collect);
      }
    },
    close() {
      engine.stdin.write("quit\n");
      reader.close();
    },
  };
}

export async function evaluatePosition(fen) {
  const session = await createStockfishSession();

  try {
    return await session.evaluate(fen);
  } finally {
    session.close();
  }
}

export async function evaluateLines(fen, { multiPv = 3, depth = config.engineDepth } = {}) {
  const session = await createStockfishSession({ multiPv, depth });

  try {
    return await session.evaluate(fen);
  } finally {
    session.close();
  }
}
