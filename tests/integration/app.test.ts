import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { once } from "node:events";
import { test } from "node:test";
import { createApp } from "../../src/app.js";
import { WebmergeClient } from "../../src/client.js";

async function listen(app: ReturnType<typeof createApp>) {
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address() as AddressInfo;

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    async close() {
      if (server.listening) {
        await new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        });
      }
    }
  };
}

test("Express health and folder routes use the injected client", async () => {
  const client = new WebmergeClient({
    apiKey: "test-key",
    apiSecret: "test-secret",
    baseUrl: "https://www.webmerge.test",
    fetch: async (input) => {
      const path = new URL(String(input)).pathname;
      const body =
        path === "/api/folders/documents"
          ? [{ id: "documents", name: "Documents", type: "folder" }]
          : [{ id: "root", name: "Root", type: "folder" }];
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }
  });
  const server = await listen(createApp({ clientFactory: () => client }));

  try {
    const health = await fetch(`${server.baseUrl}/health`);
    const documentFolders = await fetch(`${server.baseUrl}/api/documents/folders`);
    const folders = await fetch(`${server.baseUrl}/api/folders`);

    assert.deepEqual(await health.json(), { ok: true, service: "formstack-documents-api-connector" });
    assert.deepEqual(await documentFolders.json(), [{ id: "documents", name: "Documents", type: "folder" }]);
    assert.deepEqual(await folders.json(), [{ id: "root", name: "Root", type: "folder" }]);
  } finally {
    await server.close();
  }
});

test("Express maps validation, upstream API, and binary tool responses", async () => {
  const client = new WebmergeClient({
    apiKey: "test-key",
    apiSecret: "test-secret",
    baseUrl: "https://www.webmerge.test",
    fetch: async (input) => {
      const path = new URL(String(input)).pathname;
      if (path === "/api/folders") {
        return new Response(JSON.stringify({ error: "rate limited" }), {
          status: 429,
          headers: { "content-type": "application/json" }
        });
      }

      return new Response(Buffer.from("converted-pdf"), {
        status: 200,
        headers: {
          "content-type": "application/pdf",
          "content-disposition": "attachment; filename=converted.pdf"
        }
      });
    }
  });
  const server = await listen(createApp({ clientFactory: () => client }));

  try {
    const invalid = await fetch(`${server.baseUrl}/api/tools/convert-to-pdf`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ file: { name: "missing-source.docx" } })
    });
    const upstreamError = await fetch(`${server.baseUrl}/api/folders`);
    const binary = await fetch(`${server.baseUrl}/api/tools/convert-to-pdf`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ file: { name: "source.docx", contents: "base64" } })
    });

    assert.equal(invalid.status, 400);
    assert.equal((await invalid.json()).message, "Invalid request");
    assert.deepEqual(await upstreamError.json(), {
      status: 429,
      message: "Webmerge API request failed with status 429",
      details: { error: "rate limited" }
    });
    assert.equal(binary.status, 200);
    assert.equal(binary.headers.get("content-type"), "application/pdf");
    assert.equal(binary.headers.get("content-disposition"), "attachment; filename=converted.pdf");
    assert.equal(Buffer.from(await binary.arrayBuffer()).toString(), "converted-pdf");
  } finally {
    await server.close();
  }
});

test("Express rejects unauthenticated API requests", async () => {
  const server = await listen(createApp());

  try {
    const response = await fetch(`${server.baseUrl}/api/folders`);

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), {
      status: 401,
      message: "Provide credentials via x-webmerge-api-key/x-webmerge-api-secret or Basic auth"
    });
  } finally {
    await server.close();
  }
});
