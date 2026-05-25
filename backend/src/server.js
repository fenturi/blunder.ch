import { createApp } from "./app.js";
import { config } from "./config.js";
import { logInfo } from "./utils/logger.js";

const app = createApp();

app.listen(config.port, () => {
  logInfo("backend-listening", { port: config.port });
});
