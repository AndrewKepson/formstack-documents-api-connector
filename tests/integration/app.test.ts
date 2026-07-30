import assert from "node:assert/strict";
import { test } from "node:test";
import { createApp } from "../../src/app.js";
import { WebmergeClient } from "../../src/client.js";

interface CapturedRequest {
  method: string;
  url: string;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

function createInjectedClient(requests: CapturedRequest[]): WebmergeClient {
  return new WebmergeClient({
    apiKey: "test-key",
    apiSecret: "test-secret",
    baseUrl: "https://www.webmerge.test",
    fetch: async (input, init) => {
      const url = new URL(String(input));
      const path = url.pathname;
      const method = init?.method ?? "GET";
      requests.push({ method, url: `${path}${url.search}` });

      if (path.startsWith("/api/tools/")) {
        return new Response(Buffer.from("tool-output"), {
          headers: {
            "content-type": "application/pdf",
            "content-disposition": "attachment; filename=result.pdf"
          }
        });
      }
      if (path === "/api/documents/doc-1") {
        return jsonResponse({
          id: "doc-1",
          key: "document-key",
          type: "pdf",
          name: "Document",
          output: "pdf",
          url: "https://www.webmerge.test/merge/doc-1/document-key"
        });
      }
      if (path === "/api/documents/doc-1/file") {
        return jsonResponse({ type: "pdf", last_update: "today", contents: "base64" });
      }
      if (path === "/api/routes/route-1") {
        return jsonResponse({
          id: "route-1",
          key: "route-key",
          name: "Route",
          url: "https://www.webmerge.test/route/route-1"
        });
      }

      return jsonResponse([]);
    }
  });
}

test("Hono preserves every HTTP route family", async () => {
  const requests: CapturedRequest[] = [];
  const client = createInjectedClient(requests);
  let clientFactoryCalls = 0;
  const app = createApp({
    clientFactory: (request) => {
      assert.ok(request instanceof Request);
      clientFactoryCalls += 1;
      return client;
    }
  });
  const file = { name: "source.docx", contents: "base64" };
  const cases: Array<{ path: string; init?: RequestInit }> = [
    { path: "/health" },
    { path: "/api/documents?search=Contract&folder=Templates" },
    { path: "/api/documents/folders" },
    { path: "/api/folders" },
    { path: "/api/documents/doc-1" },
    { path: "/api/documents/doc-1/fields?attributes=1" },
    { path: "/api/documents/doc-1/file" },
    { path: "/api/documents/doc-1/deliveries" },
    { path: "/api/routes" },
    { path: "/api/routes/route-1" },
    { path: "/api/routes/route-1/fields" },
    { path: "/api/routes/route-1/rules" },
    { path: "/api/routes/route-1/deliveries" },
    {
      path: "/api/tools/combine",
      init: { method: "POST", body: JSON.stringify({ output: "pdf", files: [file] }) }
    },
    { path: "/api/tools/convert-to-pdf", init: { method: "POST", body: JSON.stringify({ file }) } },
    { path: "/api/tools/compress-pdf", init: { method: "POST", body: JSON.stringify({ file }) } },
    {
      path: "/api/tools/encrypt-pdf",
      init: { method: "POST", body: JSON.stringify({ file, password: "secret" }) }
    },
    { path: "/api/tools/split-pdf", init: { method: "POST", body: JSON.stringify({ file }) } }
  ];

  for (const routeCase of cases) {
    const response = await app.request(routeCase.path, {
      ...routeCase.init,
      headers: routeCase.init?.body ? { "content-type": "application/json" } : undefined
    });
    assert.equal(response.status, 200, `${routeCase.init?.method ?? "GET"} ${routeCase.path}`);
  }

  assert.equal(clientFactoryCalls, 17);
  assert.deepEqual(requests, [
    { method: "GET", url: "/api/documents?search=Contract&folder=Templates" },
    { method: "GET", url: "/api/folders/documents" },
    { method: "GET", url: "/api/folders" },
    { method: "GET", url: "/api/documents/doc-1" },
    { method: "GET", url: "/api/documents/doc-1/fields?attributes=1" },
    { method: "GET", url: "/api/documents/doc-1/file" },
    { method: "GET", url: "/api/documents/doc-1/deliveries" },
    { method: "GET", url: "/api/routes" },
    { method: "GET", url: "/api/routes/route-1" },
    { method: "GET", url: "/api/routes/route-1/fields" },
    { method: "GET", url: "/api/routes/route-1/rules" },
    { method: "GET", url: "/api/routes/route-1/deliveries" },
    { method: "POST", url: "/api/tools/combine" },
    { method: "POST", url: "/api/tools/convert_to_pdf" },
    { method: "POST", url: "/api/tools/compress_pdf" },
    { method: "POST", url: "/api/tools/encrypt_pdf" },
    { method: "POST", url: "/api/tools/split_pdf" }
  ]);
});

test("Hono maps validation, upstream API, and binary tool responses", async () => {
  const client = new WebmergeClient({
    apiKey: "test-key",
    apiSecret: "test-secret",
    baseUrl: "https://www.webmerge.test",
    fetch: async (input) => {
      const path = new URL(String(input)).pathname;
      if (path === "/api/folders") {
        return jsonResponse({ error: "rate limited" }, 429);
      }

      return new Response(Buffer.from("converted-pdf"), {
        headers: {
          "content-type": "application/pdf",
          "content-disposition": "attachment; filename=converted.pdf"
        }
      });
    }
  });
  const app = createApp({ clientFactory: () => client });

  const invalid = await app.request("/api/tools/convert-to-pdf", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ file: { name: "missing-source.docx" } })
  });
  const upstreamError = await app.request("/api/folders");
  const binary = await app.request("/api/tools/convert-to-pdf", {
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
});

test("Hono rejects unauthenticated API requests and returns stable not-found responses", async () => {
  const app = createApp();
  const unauthorized = await app.request("/api/folders");
  const notFound = await app.request("/missing");

  assert.equal(unauthorized.status, 401);
  assert.deepEqual(await unauthorized.json(), {
    status: 401,
    message: "Provide credentials via x-webmerge-api-key/x-webmerge-api-secret or Basic auth"
  });
  assert.equal(notFound.status, 404);
  assert.deepEqual(await notFound.json(), { status: 404, message: "Not found" });
});

test("Hono rejects malformed tool bodies before making upstream requests", async () => {
  const requests: CapturedRequest[] = [];
  const client = createInjectedClient(requests);
  const app = createApp({ clientFactory: () => client });
  const toolPaths = [
    "/api/tools/combine",
    "/api/tools/convert-to-pdf",
    "/api/tools/compress-pdf",
    "/api/tools/encrypt-pdf",
    "/api/tools/split-pdf"
  ];

  for (const path of toolPaths) {
    const malformedJson = await app.request(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{"
    });
    const missingContentType = await app.request(path, {
      method: "POST",
      body: JSON.stringify({ file: { name: "source.pdf", contents: "base64" } })
    });
    const invalidPayload = await app.request(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}"
    });
    const oversized = await app.request(path, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": String(25 * 1024 * 1024 + 1)
      },
      body: "{}"
    });

    assert.equal(malformedJson.status, 400, `${path} malformed JSON`);
    assert.equal((await malformedJson.json()).message, "Invalid request");
    assert.equal(missingContentType.status, 400, `${path} missing content type`);
    assert.equal(invalidPayload.status, 400, `${path} invalid payload`);
    assert.deepEqual(await oversized.json(), {
      status: 413,
      message: "Request body too large"
    });
  }

  assert.deepEqual(requests, []);
});

test("Hono rejects invalid queries before making upstream requests", async () => {
  const requests: CapturedRequest[] = [];
  const client = createInjectedClient(requests);
  const app = createApp({ clientFactory: () => client });
  const emptySearch = await app.request("/api/documents?search=");
  const invalidAttributes = await app.request("/api/documents/doc-1/fields?attributes=yes");

  assert.equal(emptySearch.status, 400);
  assert.equal(invalidAttributes.status, 400);
  assert.deepEqual(requests, []);
});

test("Hono does not expose unexpected error details", async () => {
  const app = createApp({
    clientFactory: () => {
      throw new Error("sensitive internal detail");
    }
  });
  const response = await app.request("/api/folders");
  const body = await response.json();

  assert.equal(response.status, 500);
  assert.deepEqual(body, { status: 500, message: "Internal server error" });
  assert.equal(JSON.stringify(body).includes("sensitive internal detail"), false);
});
