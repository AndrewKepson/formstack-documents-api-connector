import assert from "node:assert/strict";
import { test } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

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
    const names = result.tools.map((tool) => tool.name);

    assert.ok(names.includes("list_documents"));
    assert.ok(names.includes("list_document_folders"));
    assert.ok(names.includes("convert_to_pdf"));
  } finally {
    await client.close();
  }
});
