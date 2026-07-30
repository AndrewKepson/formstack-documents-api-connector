import assert from "node:assert/strict";
import { test } from "node:test";
import {
  webmergeDeliverySchema,
  webmergeDocumentFileSchema,
  webmergeDocumentSchema,
  webmergeFieldSchema,
  webmergeFieldsSchema,
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

test("validates both embedded document field shapes without weakening field lists", () => {
  const document = {
    id: "1274769",
    key: "document-key",
    type: "pdf",
    name: "Document",
    output: "pdf",
    url: "https://www.webmerge.test/merge/1274769/document-key"
  };
  const fieldArray = [{ key: "first_name", name: "FirstName" }];
  const fieldMap = { FirstName: "first_name", LastName: "last_name" };

  assert.deepEqual(webmergeDocumentSchema.parse({ ...document, fields: fieldMap }).fields, fieldMap);
  assert.deepEqual(webmergeDocumentSchema.parse({ ...document, fields: fieldArray }).fields, fieldArray);
  assert.throws(() => webmergeDocumentSchema.parse({ ...document, fields: { FirstName: 123 } }));
  assert.deepEqual(webmergeFieldsSchema.parse(fieldArray), fieldArray);
  assert.throws(() => webmergeFieldsSchema.parse(fieldMap));
});

test("client parses document field maps while keeping the fields endpoint array-only", async () => {
  const document = {
    id: "1274769",
    key: "document-key",
    type: "pdf",
    name: "Document",
    output: "pdf",
    url: "https://www.webmerge.test/merge/1274769/document-key",
    fields: { FirstName: "first_name", LastName: "last_name" }
  };
  const client = new WebmergeClient({
    apiKey: "test-key",
    apiSecret: "test-secret",
    baseUrl: "https://www.webmerge.test",
    fetch: async (input) => {
      const path = new URL(String(input)).pathname;
      const body = path.endsWith("/fields") ? [{ key: "first_name", name: "FirstName" }] : document;
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }
  });

  assert.deepEqual(await client.getDocument("1274769"), document);
  assert.deepEqual(await client.getDocumentFields("1274769"), [
    { key: "first_name", name: "FirstName" }
  ]);

  const invalidFieldsClient = new WebmergeClient({
    apiKey: "test-key",
    apiSecret: "test-secret",
    baseUrl: "https://www.webmerge.test",
    fetch: async () =>
      new Response(JSON.stringify(document.fields), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
  });

  await assert.rejects(
    invalidFieldsClient.getDocumentFields("1274769"),
    (error) => error instanceof WebmergeApiError && error.status === 502
  );
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

test("client validates folder aliases and preserves binary response metadata", async () => {
  const paths: string[] = [];
  const client = new WebmergeClient({
    apiKey: "test-key",
    apiSecret: "test-secret",
    baseUrl: "https://www.webmerge.test",
    fetch: async (input, init) => {
      const path = new URL(String(input)).pathname;
      paths.push(path);

      if (path.startsWith("/api/folders")) {
        return new Response(JSON.stringify([{ id: 1, name: "Folder", type: "folder" }]), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }

      assert.equal(init?.method, "POST");
      assert.equal(new Headers(init?.headers).get("content-type"), "application/json");
      assert.deepEqual(JSON.parse(String(init?.body)), {
        file: { name: "source.docx", contents: "base64" }
      });
      return new Response(Buffer.from("pdf-bytes"), {
        status: 200,
        headers: {
          "content-type": "application/pdf",
          "content-disposition": "attachment; filename=result.pdf"
        }
      });
    }
  });

  assert.deepEqual(await client.listFolders(), [{ id: "1", name: "Folder", type: "folder" }]);
  assert.deepEqual(await client.listDocumentFolders(), [{ id: "1", name: "Folder", type: "folder" }]);
  const result = await client.convertToPdf({ file: { name: "source.docx", contents: "base64" } });

  assert.deepEqual(paths, ["/api/folders", "/api/folders/documents", "/api/tools/convert_to_pdf"]);
  assert.equal(result.contentType, "application/pdf");
  assert.equal(result.contentDisposition, "attachment; filename=result.pdf");
  assert.equal(result.body.toString(), "pdf-bytes");
});

test("client preserves upstream API error status and details", async () => {
  const client = new WebmergeClient({
    apiKey: "test-key",
    apiSecret: "test-secret",
    baseUrl: "https://www.webmerge.test",
    fetch: async () =>
      new Response(JSON.stringify({ error: "rate limited" }), {
        status: 429,
        headers: { "content-type": "application/json" }
      })
  });

  await assert.rejects(client.listFolders(), (error) => {
    assert.ok(error instanceof WebmergeApiError);
    assert.equal(error.status, 429);
    assert.deepEqual(error.details, { error: "rate limited" });
    return true;
  });
});
