import { Queue } from "bullmq";
import { redis } from "./redis.js";

export const queueNames = {
  imports: "imports",
  analysis: "analysis",
};

export const importQueue = new Queue(queueNames.imports, {
  connection: redis,
});

export const analysisQueue = new Queue(queueNames.analysis, {
  connection: redis,
});
