import "dotenv/config";
import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { parseServerConfig } from "./server-config.schema.js";

const REQUEST_TIMEOUT_MS = 60_000;
const HEADERS_TIMEOUT_MS = 30_000;
const KEEP_ALIVE_TIMEOUT_MS = 5_000;
const SHUTDOWN_TIMEOUT_MS = 10_000;

const config = parseServerConfig();
const app = createApp({
  allowEnvironmentCredentialFallback: config.allowEnvironmentCredentialFallback
});

const server = serve(
  {
    fetch: app.fetch,
    hostname: config.host,
    port: config.port,
    serverOptions: {
      requestTimeout: REQUEST_TIMEOUT_MS,
      headersTimeout: HEADERS_TIMEOUT_MS,
      keepAliveTimeout: KEEP_ALIVE_TIMEOUT_MS
    }
  },
  (info) => {
    console.log(`Formstack Documents connector listening on http://${config.host}:${info.port}`);
  }
);

server.on("error", (error) => {
  console.error("Server error", error);
  process.exitCode = 1;
});

let isShuttingDown = false;

function shutdown(signal: NodeJS.Signals): void {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;

  const deadline = setTimeout(() => {
    console.error(`Server did not close within ${SHUTDOWN_TIMEOUT_MS}ms after ${signal}`);
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  deadline.unref();

  server.close((error) => {
    clearTimeout(deadline);
    if (error) {
      console.error("Server shutdown failed", error);
      process.exitCode = 1;
    }
  });
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
