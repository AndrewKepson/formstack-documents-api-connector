import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { once } from "node:events";
import { test } from "node:test";
import { createApp } from "../../src/app.js";
import { WebmergeClient } from "../../src/client.js";

test("Express health and folder routes use the injected client", async () => {
  const client = new WebmergeClient({
    apiKey: "test-key",
    apiSecret: "test-secret",
    baseUrl: "https://www.webmerge.test",
    fetch: async (input) => {
      const path = new URL(String(input)).pathname;
      const body = path === "/api/folders/documents" ? [{ id: "documents", name: "Documents", type: "folder" }] : [];
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }
  });
  const server = createApp({ clientFactory: () => client }).listen(0, "127.0.0.1");

  try {
    await once(server, "listening");
    const { port } = server.address() as AddressInfo;
    const health = await fetch(`http://127.0.0.1:${port}/health`);
    const folders = await fetch(`http://127.0.0.1:${port}/api/documents/folders`);

    assert.deepEqual(await health.json(), { ok: true, service: "formstack-documents-api-connector" });
    assert.deepEqual(await folders.json(), [{ id: "documents", name: "Documents", type: "folder" }]);
  } finally {
    if (server.listening) {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  }
});
