import assert from "node:assert/strict";
import { test } from "node:test";
import { WebmergeClient } from "../../src/client.js";
import type { WebmergeDocument, WebmergeDocumentFile, WebmergeField } from "../../src/contracts.types.js";

type CapturedRequest = {
  url: string;
  method: string;
  authorization: string | null;
  contentType: string | null;
  body: unknown;
};

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}

function createMockFetch() {
  const requests: CapturedRequest[] = [];

  const fetchImpl: typeof fetch = async (input, init = {}) => {
    const url = String(input);
    const headers = new Headers(init.headers);
    const request: CapturedRequest = {
      url,
      method: init.method ?? "GET",
      authorization: headers.get("authorization"),
      contentType: headers.get("content-type"),
      body: init.body ? JSON.parse(String(init.body)) : undefined
    };
    requests.push(request);

    if (url.endsWith("/api/documents") && request.method === "POST") {
      return jsonResponse({
        id: "sandbox-document",
        key: "abc123",
        type: request.body?.["type"],
        name: request.body?.["name"],
        output: request.body?.["output"],
        url: "https://www.webmerge.me/merge/sandbox-document/abc123"
      } satisfies WebmergeDocument);
    }

    if (url.endsWith("/api/documents/sandbox-document") && request.method === "PUT") {
      return jsonResponse({
        id: "sandbox-document",
        key: "abc123",
        type: "pdf",
        name: "Sandbox Updated",
        output: request.body?.["output"] ?? "pdf",
        url: "https://www.webmerge.me/merge/sandbox-document/abc123"
      } satisfies WebmergeDocument);
    }

    if (url.endsWith("/api/documents/sandbox-document/file") && request.method === "GET") {
      return jsonResponse({
        type: "pdf",
        last_update: "2026-07-04 12:20:22",
        contents: "JVBERi0xLjQK"
      } satisfies WebmergeDocumentFile);
    }

    if (url.endsWith("/api/documents/sandbox-document/fields") && request.method === "GET") {
      return jsonResponse([
        { key: "field_1", name: "codex_api_sandbox_v2_text_001" },
        { key: "field_2", name: "codex_api_sandbox_v2_check_001" }
      ] satisfies WebmergeField[]);
    }

    return new Response(JSON.stringify({ message: `Unhandled ${request.method} ${url}` }), {
      status: 404,
      headers: { "content-type": "application/json" }
    });
  };

  return { fetchImpl, requests };
}

test("creates, updates, downloads, and inspects a PDF document", async () => {
  const { fetchImpl, requests } = createMockFetch();
  const client = new WebmergeClient({
    apiKey: "test-key",
    apiSecret: "test-secret",
    baseUrl: "https://www.webmerge.test",
    fetch: fetchImpl
  });

  const created = await client.createDocument({
    name: "Sandbox Created",
    type: "pdf",
    output: "pdf",
    folder: "API Sandbox",
    file_contents: "base64-v1"
  });
  const updated = await client.updateDocument(created.id, {
    output: "pdf",
    file_contents: "base64-v2"
  });
  const file = await client.getDocumentFile(created.id);
  const fields = await client.getDocumentFields(created.id);

  assert.equal(created.id, "sandbox-document");
  assert.equal(updated.name, "Sandbox Updated");
  assert.equal(file.contents, "JVBERi0xLjQK");
  assert.deepEqual(
    fields.map((field) => field.name),
    ["codex_api_sandbox_v2_text_001", "codex_api_sandbox_v2_check_001"]
  );

  assert.deepEqual(
    requests.map((request) => [request.method, new URL(request.url).pathname]),
    [
      ["POST", "/api/documents"],
      ["PUT", "/api/documents/sandbox-document"],
      ["GET", "/api/documents/sandbox-document/file"],
      ["GET", "/api/documents/sandbox-document/fields"]
    ]
  );

  assert.equal(requests[0]?.contentType, "application/json");
  assert.equal(requests[1]?.contentType, "application/json");
  assert.equal(requests[0]?.authorization, "Basic dGVzdC1rZXk6dGVzdC1zZWNyZXQ=");
  assert.deepEqual(requests[0]?.body, {
    name: "Sandbox Created",
    type: "pdf",
    output: "pdf",
    folder: "API Sandbox",
    file_contents: "base64-v1"
  });
  assert.deepEqual(requests[1]?.body, {
    output: "pdf",
    file_contents: "base64-v2"
  });
});
