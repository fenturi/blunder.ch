import { Worker } from "bullmq";
import { config } from "./config.js";
import { runMigrations } from "./migrations.js";
import { queueNames } from "./queue.js";
import { redis } from "./redis.js";
import { analyzeGame } from "./services/analysisService.js";
import { importGamesForUser } from "./services/gameImportService.js";
import { setImportStatus } from "./repositories/importsRepository.js";
import { logError, logInfo } from "./utils/logger.js";
import { markGameAnalysis } from "./repositories/gamesRepository.js";

await runMigrations();

const importWorker = new Worker(
  queueNames.imports,
  async (job) => {
    try {
      await importGamesForUser(job.data);
    } catch (error) {
      await setImportStatus(job.data.importId, "failed", {
        failedReason: error.message,
      });
      throw error;
    }
  },
  {
    connection: redis,
    concurrency: config.importConcurrency,
  }
);

const analysisWorker = new Worker(
  queueNames.analysis,
  async (job) => {
    try {
      await analyzeGame(job.data.gameId);
    } catch (error) {
      await markGameAnalysis(job.data.gameId, {
        status: "failed",
        completedAt: new Date(),
        error: error.message,
      });
      throw error;
    }
  },
  {
    connection: redis,
    concurrency: config.analysisConcurrency,
  }
);

for (const [name, worker] of [
  ["imports", importWorker],
  ["analysis", analysisWorker],
]) {
  worker.on("completed", (job) => {
    logInfo("worker-job-completed", { worker: name, jobId: job.id });
  });

  worker.on("failed", (job, error) => {
    logError("worker-job-failed", error, { worker: name, jobId: job?.id });
  });
}
