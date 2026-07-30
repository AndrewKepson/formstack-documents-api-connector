import assert from "node:assert/strict";
import { test } from "node:test";
import {
  combineFilesSchema,
  documentCreateSchema,
  documentUpdateSchema,
  encryptPdfSchema,
  singleFileToolSchema,
  splitPdfSchema
} from "../src/contracts.schema.js";

test("validates document create and update payloads", () => {
  assert.deepEqual(
    documentCreateSchema.parse({
      name: "Sandbox Document",
      type: "pdf",
      output: "pdf",
      file_contents: "base64-data",
      custom_setting: true
    }),
    {
      name: "Sandbox Document",
      type: "pdf",
      output: "pdf",
      file_contents: "base64-data",
      custom_setting: true
    }
  );
  assert.throws(() => documentCreateSchema.parse({ type: "pdf", output: "pdf" }));
  assert.deepEqual(documentUpdateSchema.parse({ name: "Updated" }), { name: "Updated" });
  assert.throws(() => documentUpdateSchema.parse({}));
});

test("validates file tool payloads", () => {
  const file = { name: "document.docx", url: "https://example.com/document.docx" };

  assert.deepEqual(singleFileToolSchema.parse({ file }), { file });
  assert.deepEqual(combineFilesSchema.parse({ output: "pdf", files: [file] }), {
    output: "pdf",
    files: [file]
  });
  assert.deepEqual(encryptPdfSchema.parse({ file, password: "secret" }), { file, password: "secret" });
  assert.deepEqual(splitPdfSchema.parse({ file, extract: "1-2" }), { file, extract: "1-2" });

  assert.throws(() => singleFileToolSchema.parse({ file: { name: "document.docx" } }));
  assert.throws(() => combineFilesSchema.parse({ output: "pdf", files: [] }));
  assert.throws(() => encryptPdfSchema.parse({ file, password: "" }));
});
