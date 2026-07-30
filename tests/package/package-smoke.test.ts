import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

interface PackResult {
  files: Array<{ path: string }>;
}

test("npm package contains the public SDK and executable entry points", async () => {
  const cacheDirectory = mkdtempSync(join(tmpdir(), "formstack-documents-npm-cache-"));

  try {
    const result = spawnSync("npm", ["pack", "--dry-run", "--json"], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: { ...process.env, npm_config_cache: cacheDirectory }
    });

    assert.equal(result.status, 0, result.stderr);
    const [packed] = JSON.parse(result.stdout) as PackResult[];
    const files = new Set(packed.files.map((file) => file.path));

    assert.ok(files.has("dist/index.js"));
    assert.ok(files.has("dist/index.d.ts"));
    assert.ok(files.has("dist/cli.js"));
    assert.ok(files.has("dist/mcp.js"));

    const sdk = (await import("../../dist/index.js")) as Record<string, unknown>;
    assert.equal(typeof sdk.WebmergeClient, "function");
    assert.equal(typeof sdk.createApp, "function");
    assert.equal(typeof sdk.createMcpServer, "function");
  } finally {
    rmSync(cacheDirectory, { recursive: true, force: true });
  }
});
