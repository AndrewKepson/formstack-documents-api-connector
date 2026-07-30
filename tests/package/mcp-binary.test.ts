import assert from "node:assert/strict";
import { test } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { readFileSync } from "node:fs";

const { name: packageName, version: packageVersion } = JSON.parse(readFileSync("package.json", "utf8")) as {
  name: string;
  version: string;
};

test("published MCP entry point initializes and lists tools", async () => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["dist/mcp.js"],
    cwd: process.cwd(),
    stderr: "pipe"
  });
  const client = new Client({ name: "formstack-documents-test", version: "1.0.0" });

  try {
    await client.connect(transport);
    const result = await client.listTools();
    const names = result.tools.map((tool) => tool.name).sort();

    assert.deepEqual(client.getServerVersion(), { name: packageName, version: packageVersion });
    assert.deepEqual(names, [
      "combine_files",
      "compress_pdf",
      "convert_to_pdf",
      "encrypt_pdf",
      "get_document",
      "get_document_deliveries",
      "get_document_fields",
      "get_document_file",
      "get_route",
      "get_route_deliveries",
      "get_route_fields",
      "get_route_rules",
      "list_document_folders",
      "list_documents",
      "list_routes",
      "split_pdf"
    ]);
  } finally {
    await client.close();
  }
});
