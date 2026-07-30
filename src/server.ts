import "dotenv/config";
import { createApp } from "./app.js";
import { parseServerConfig } from "./server-config.schema.js";

const config = parseServerConfig();
const app = createApp({
  allowEnvironmentCredentialFallback: config.allowEnvironmentCredentialFallback
});

app.listen(config.port, config.host, () => {
  console.log(`Formstack Documents connector listening on http://${config.host}:${config.port}`);
});
