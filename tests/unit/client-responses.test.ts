import assert from "node:assert/strict";
import { test } from "node:test";
import {
  webmergeDeliverySchema,
  webmergeDocumentFileSchema,
  webmergeDocumentSchema,
  webmergeFieldSchema,
  webmergeFolderSchema,
  webmergeRouteRuleSchema,
  webmergeRouteSchema
} from "../../src/contracts.schema.js";
import { WebmergeClient } from "../../src/client.js";
import { WebmergeApiError } from "../../src/errors.js";

test("validates each Formstack response family", () => {
  assert.equal(
    webmergeDocumentSchema.parse({
      id: 1,
      key: "document-key",
      type: "pdf",
      name: "Document",
      output: "pdf",
      url: "https://www.webmerge.test/merge/1/document-key"
    }).id,
    "1"
  );
  assert.equal(webmergeFolderSchema.parse({ id: 2, name: "Folder", type: "folder" }).id, "2");
  assert.deepEqual(webmergeFieldSchema.parse({ key: "field", name: "Field" }), {
    key: "field",
    name: "Field"
  });
  assert.deepEqual(webmergeDocumentFileSchema.parse({ type: "pdf", last_update: "today", contents: "base64" }), {
    type: "pdf",
    last_update: "today",
    contents: "base64"
  });
  assert.equal(webmergeDeliverySchema.parse({ id: 3, type: "webhook", settings: {} }).id, "3");
  assert.equal(
    webmergeRouteSchema.parse({
      id: 4,
      key: "route-key",
      name: "Route",
      url: "https://www.webmerge.test/route/4"
    }).id,
    "4"
  );
  assert.deepEqual(
    webmergeRouteRuleSchema.parse({ conditions: [{ field: "status", exp: "==", value: "active" }] }),
    { conditions: [{ field: "status", exp: "==", value: "active" }] }
  );

  assert.throws(() => webmergeDocumentSchema.parse({ id: "1" }));
  assert.throws(() => webmergeFolderSchema.parse({ id: "2", type: "folder" }));
  assert.throws(() => webmergeFieldSchema.parse({ key: "field" }));
  assert.throws(() => webmergeDocumentFileSchema.parse({ type: "pdf", last_update: "today" }));
  assert.throws(() => webmergeDeliverySchema.parse({ id: "3", type: "webhook", settings: [] }));
  assert.throws(() => webmergeRouteSchema.parse({ id: "4", name: "Route", url: "route" }));
  assert.throws(() => webmergeRouteRuleSchema.parse({ conditions: [{ exp: "==", value: "active" }] }));
});

test("client rejects malformed JSON responses as upstream gateway errors", async () => {
  const client = new WebmergeClient({
    apiKey: "test-key",
    apiSecret: "test-secret",
    baseUrl: "https://www.webmerge.test",
    fetch: async () =>
      new Response(JSON.stringify([{ id: "incomplete" }]), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
  });

  await assert.rejects(
    client.listDocuments(),
    (error) => error instanceof WebmergeApiError && error.status === 502
  );
});

test("client rejects non-JSON success responses as upstream gateway errors", async () => {
  const client = new WebmergeClient({
    apiKey: "test-key",
    apiSecret: "test-secret",
    baseUrl: "https://www.webmerge.test",
    fetch: async () => new Response("not json", { status: 200, headers: { "content-type": "text/plain" } })
  });

  await assert.rejects(
    client.listDocuments(),
    (error) => error instanceof WebmergeApiError && error.status === 502
  );
});
