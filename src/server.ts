import "dotenv/config";
import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { parseServerConfig } from "./server-config.schema.js";

const config = parseServerConfig();
const app = createApp({
  allowEnvironmentCredentialFallback: config.allowEnvironmentCredentialFallback
});

serve({ fetch: app.fetch, hostname: config.host, port: config.port }, (info) => {
  console.log(`Formstack Documents connector listening on http://${config.host}:${info.port}`);
});
