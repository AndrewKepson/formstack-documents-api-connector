#!/usr/bin/env node
import "dotenv/config";
import { writeFile } from "node:fs/promises";
import { Command, Option } from "commander";
import { WebmergeClient } from "./client.js";
import type { BinaryResponse, WebmergeClientOptions } from "./types.js";

function clientFromOptions(options: Record<string, string | undefined>): WebmergeClient {
  const clientOptions: WebmergeClientOptions = {
    apiKey: options.key,
    apiSecret: options.secret,
    baseUrl: options.baseUrl
  };

  return new WebmergeClient(clientOptions);
}

function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

async function writeBinary(result: BinaryResponse, output?: string): Promise<void> {
  if (output) {
    await writeFile(output, result.body);
    console.log(JSON.stringify({ output, contentType: result.contentType, bytes: result.body.length }, null, 2));
    return;
  }

  process.stdout.write(result.body);
}

function parseJson<T>(json: string): T {
  return JSON.parse(json) as T;
}

const program = new Command();

program
  .name("formstack-documents")
  .description("CLI for the Formstack Documents (Webmerge) API")
  .version("1.0.0")
  .addOption(new Option("--key <key>", "API key").env("WEBMERGE_API_KEY"))
  .addOption(new Option("--secret <secret>", "API secret").env("WEBMERGE_API_SECRET"))
  .addOption(new Option("--base-url <url>", "Base URL").env("WEBMERGE_BASE_URL").default("https://www.webmerge.me"));

const documents = program.command("documents").description("Read document templates");

documents
  .command("list")
  .option("--search <term>", "Filter documents by search term")
  .option("--folder <name>", "Filter documents by folder name")
  .action(async (options) => {
    printJson(await clientFromOptions(program.opts()).listDocuments(options));
  });

documents
  .command("get")
  .argument("<id>", "Document ID")
  .action(async (id) => {
    printJson(await clientFromOptions(program.opts()).getDocument(id));
  });

documents
  .command("fields")
  .argument("<id>", "Document ID")
  .option("--attributes", "Include field attributes")
  .action(async (id, options) => {
    printJson(await clientFromOptions(program.opts()).getDocumentFields(id, { attributes: options.attributes }));
  });

documents
  .command("file")
  .argument("<id>", "Document ID")
  .action(async (id) => {
    printJson(await clientFromOptions(program.opts()).getDocumentFile(id));
  });

documents
  .command("deliveries")
  .argument("<id>", "Document ID")
  .action(async (id) => {
    printJson(await clientFromOptions(program.opts()).getDocumentDeliveries(id));
  });

const routes = program.command("routes").description("Read data routes");

routes.command("list").action(async () => {
  printJson(await clientFromOptions(program.opts()).listRoutes());
});

routes
  .command("get")
  .argument("<id>", "Route ID")
  .action(async (id) => {
    printJson(await clientFromOptions(program.opts()).getRoute(id));
  });

routes
  .command("fields")
  .argument("<id>", "Route ID")
  .action(async (id) => {
    printJson(await clientFromOptions(program.opts()).getRouteFields(id));
  });

routes
  .command("rules")
  .argument("<id>", "Route ID")
  .action(async (id) => {
    printJson(await clientFromOptions(program.opts()).getRouteRules(id));
  });

routes
  .command("deliveries")
  .argument("<id>", "Route ID")
  .action(async (id) => {
    printJson(await clientFromOptions(program.opts()).getRouteDeliveries(id));
  });

const tools = program.command("tools").description("Run non-account-mutating file tools");

tools
  .command("combine")
  .requiredOption("--payload <json>", "JSON payload with output and files")
  .option("--out <file>", "Write binary result to a file")
  .action(async (options) => {
    const result = await clientFromOptions(program.opts()).combineFiles(parseJson(options.payload));
    await writeBinary(result, options.out);
  });

tools
  .command("convert-to-pdf")
  .requiredOption("--payload <json>", "JSON payload with file")
  .option("--out <file>", "Write PDF result to a file")
  .action(async (options) => {
    const result = await clientFromOptions(program.opts()).convertToPdf(parseJson(options.payload));
    await writeBinary(result, options.out);
  });

tools
  .command("compress-pdf")
  .requiredOption("--payload <json>", "JSON payload with file")
  .option("--out <file>", "Write PDF result to a file")
  .action(async (options) => {
    const result = await clientFromOptions(program.opts()).compressPdf(parseJson(options.payload));
    await writeBinary(result, options.out);
  });

tools
  .command("encrypt-pdf")
  .requiredOption("--payload <json>", "JSON payload with file, password, and optional permissions")
  .option("--out <file>", "Write PDF result to a file")
  .action(async (options) => {
    const result = await clientFromOptions(program.opts()).encryptPdf(parseJson(options.payload));
    await writeBinary(result, options.out);
  });

tools
  .command("split-pdf")
  .requiredOption("--payload <json>", "JSON payload with file and optional extract/remove ranges")
  .option("--out <file>", "Write ZIP result to a file")
  .action(async (options) => {
    const result = await clientFromOptions(program.opts()).splitPdf(parseJson(options.payload));
    await writeBinary(result, options.out);
  });

program.parseAsync().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
