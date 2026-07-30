import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const packageMetadata = JSON.parse(readFileSync("package.json", "utf8")) as { version: string };

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

test("built CLI reports package version and command help", () => {
  const version = runCli(["--version"]);
  const help = runCli(["--help"]);

  assert.equal(version.status, 0, version.stderr);
  assert.equal(version.stdout.trim(), packageMetadata.version);
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /documents/);
  assert.match(help.stdout, /routes/);
  assert.match(help.stdout, /tools/);
});

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

test("CLI reports malformed JSON and missing required options as failures", () => {
  const malformedJson = runCli(["documents", "create", "--payload", "{"]);
  const missingPayload = runCli(["tools", "convert-to-pdf"]);

  assert.equal(malformedJson.status, 1);
  assert.match(malformedJson.stderr, /JSON/);
  assert.equal(missingPayload.status, 1);
  assert.match(missingPayload.stderr, /required option '--payload/);
});
