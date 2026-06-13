import { createApp } from "./app.js";
import { config } from "./config.js";
import { runMigrations } from "./migrations.js";
import { logInfo } from "./utils/logger.js";

await runMigrations();

const app = createApp();

app.listen(config.port, () => {
  logInfo("backend-listening", { port: config.port });
});
