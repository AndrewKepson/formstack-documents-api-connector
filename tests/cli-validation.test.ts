import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

function runCli(args: string[]) {
  return spawnSync(process.execPath, ["dist/cli.js", ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      WEBMERGE_API_KEY: "",
      WEBMERGE_API_SECRET: ""
    }
  });
}

test("CLI rejects invalid document writes before creating a client request", () => {
  const result = runCli(["documents", "create", "--payload", "{}"]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /name/);
  assert.doesNotMatch(result.stderr, /Missing Formstack Documents API key or secret/);
});

test("CLI rejects invalid file tool payloads before creating a client request", () => {
  const result = runCli(["tools", "convert-to-pdf", "--payload", '{"file":{"name":"document.docx"}}']);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Either url or contents is required/);
  assert.doesNotMatch(result.stderr, /Missing Formstack Documents API key or secret/);
});
