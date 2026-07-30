import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

interface PackResult {
  filename: string;
  files: Array<{ path: string }>;
}

const packageMetadata = JSON.parse(readFileSync("package.json", "utf8")) as { name: string; version: string };

test("packed artifact exposes the SDK and runnable CLI/MCP entry points", async () => {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), "formstack-documents-package-"));
  const cacheDirectory = join(temporaryDirectory, "npm-cache");
  const extractedDirectory = join(temporaryDirectory, "extracted");
  mkdirSync(extractedDirectory);

  try {
    const result = spawnSync("npm", ["pack", "--json", "--pack-destination", temporaryDirectory], {
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

    const extract = spawnSync("tar", ["-xzf", join(temporaryDirectory, packed.filename), "-C", extractedDirectory], {
      encoding: "utf8"
    });
    assert.equal(extract.status, 0, extract.stderr);

    const packageDirectory = join(extractedDirectory, "package");
    symlinkSync(join(process.cwd(), "node_modules"), join(packageDirectory, "node_modules"), "dir");

    const consumerDirectory = join(temporaryDirectory, "consumer");
    const scopeDirectory = join(consumerDirectory, "node_modules", "@redrockswebdevelopment");
    mkdirSync(scopeDirectory, { recursive: true });
    symlinkSync(packageDirectory, join(scopeDirectory, "formstack-documents-api-connector"), "dir");
    const rootImport = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "--eval",
        `import * as sdk from ${JSON.stringify(packageMetadata.name)}; const app = sdk.createApp(); process.stdout.write(JSON.stringify([typeof sdk.WebmergeClient, typeof sdk.createApp, typeof sdk.createMcpServer, typeof app.fetch, typeof app.request]));`
      ],
      { cwd: consumerDirectory, encoding: "utf8" }
    );
    assert.equal(rootImport.status, 0, rootImport.stderr);
    assert.deepEqual(JSON.parse(rootImport.stdout), [
      "function",
      "function",
      "function",
      "function",
      "function"
    ]);

    const cli = spawnSync(process.execPath, [join(packageDirectory, "dist/cli.js"), "--version"], {
      encoding: "utf8"
    });
    assert.equal(cli.status, 0, cli.stderr);
    assert.equal(cli.stdout.trim(), packageMetadata.version);

    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [join(packageDirectory, "dist/mcp.js")],
      stderr: "pipe"
    });
    const client = new Client({ name: "packed-artifact-test", version: "1.0.0" });
    try {
      await client.connect(transport);
      assert.deepEqual(client.getServerVersion(), {
        name: packageMetadata.name,
        version: packageMetadata.version
      });
      assert.ok((await client.listTools()).tools.some((tool) => tool.name === "list_documents"));
    } finally {
      await client.close();
    }
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});
