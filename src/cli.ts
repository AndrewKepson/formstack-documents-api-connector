#!/usr/bin/env node
import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";
import { Command, Option } from "commander";
import { WebmergeClient } from "./client.js";
import {
  combineFilesSchema,
  documentCreateSchema,
  documentUpdateSchema,
  encryptPdfSchema,
  singleFileToolSchema,
  splitPdfSchema
} from "./contracts.schema.js";
import { parseDeliveryCreateRequest, parseDeliveryUpdateRequest } from "./deliveries.schema.js";
import type {
  BinaryResponse,
  WebmergeClientOptions,
  WebmergeDocumentFile
} from "./contracts.types.js";
import { PACKAGE_VERSION } from "./version.js";

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

function parseJson(json: string): unknown {
  return JSON.parse(json) as unknown;
}

async function readJsonPayload(payload?: string, payloadFile?: string): Promise<unknown> {
  if ((payload && payloadFile) || (!payload && !payloadFile)) {
    throw new Error("Provide exactly one of --payload or --payload-file.");
  }

  const json = payloadFile ? await readFile(payloadFile, "utf8") : payload;
  return parseJson(json ?? "");
}

async function writeDocumentFile(result: WebmergeDocumentFile, output?: string): Promise<void> {
  if (!output) {
    printJson(result);
    return;
  }

  const body = Buffer.from(result.contents, "base64");
  await writeFile(output, body);
  printJson({
    output,
    type: result.type,
    last_update: result.last_update,
    bytes: body.length
  });
}

const program = new Command();

program
  .name("formstack-documents")
  .description("CLI for the Formstack Documents (Webmerge) API")
  .version(PACKAGE_VERSION)
  .addOption(new Option("--key <key>", "API key").env("WEBMERGE_API_KEY"))
  .addOption(new Option("--secret <secret>", "API secret").env("WEBMERGE_API_SECRET"))
  .addOption(new Option("--base-url <url>", "Base URL").env("WEBMERGE_BASE_URL").default("https://www.webmerge.me"));

const documents = program.command("documents").description("Manage document templates");

documents
  .command("list")
  .option("--search <term>", "Filter documents by search term")
  .option("--folder <name>", "Filter documents by folder name")
  .action(async (options) => {
    printJson(await clientFromOptions(program.opts()).listDocuments(options));
  });

documents
  .command("folders")
  .description("List document folders. The API returns folder IDs and leaf names, not full nested paths.")
  .action(async () => {
    printJson(await clientFromOptions(program.opts()).listDocumentFolders());
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
  .option("--out <file>", "Decode base64 file contents and write the uploaded file to disk")
  .action(async (id, options) => {
    const result = await clientFromOptions(program.opts()).getDocumentFile(id);
    await writeDocumentFile(result, options.out);
  });

documents
  .command("create")
  .description("Create a document template. Prefer project-local allowlisted CLIs for production writes.")
  .option("--payload <json>", "JSON create payload")
  .option("--payload-file <file>", "Read JSON create payload from a file")
  .action(async (options) => {
    const payload = documentCreateSchema.parse(await readJsonPayload(options.payload, options.payloadFile));
    printJson(await clientFromOptions(program.opts()).createDocument(payload));
  });

documents
  .command("update")
  .argument("<id>", "Document ID")
  .description("Update a document template. Prefer project-local allowlisted CLIs for production writes.")
  .option("--payload <json>", "JSON update payload")
  .option("--payload-file <file>", "Read JSON update payload from a file")
  .action(async (id, options) => {
    const payload = documentUpdateSchema.parse(await readJsonPayload(options.payload, options.payloadFile));
    printJson(await clientFromOptions(program.opts()).updateDocument(id, payload));
  });

const documentDeliveries = documents
  .command("deliveries")
  .description("List, create, or update document deliveries")
  .argument("[id]", "Document ID")
  .action(async (id) => {
    if (!id) {
      documentDeliveries.help({ error: true });
    }
    printJson(await clientFromOptions(program.opts()).getDocumentDeliveries(id));
  });

documentDeliveries
  .command("list")
  .argument("<id>", "Document ID")
  .action(async (id) => {
    printJson(await clientFromOptions(program.opts()).getDocumentDeliveries(id));
  });

documentDeliveries
  .command("create")
  .argument("<id>", "Document ID")
  .description("Create a document delivery. Prefer project-local allowlisted CLIs for production writes.")
  .option("--payload <json>", "JSON delivery payload")
  .option("--payload-file <file>", "Read JSON delivery payload from a file")
  .action(async (id, options) => {
    const payload = parseDeliveryCreateRequest(await readJsonPayload(options.payload, options.payloadFile));
    printJson(await clientFromOptions(program.opts()).createDocumentDelivery(id, payload));
  });

documentDeliveries
  .command("update")
  .argument("<document-id>", "Document ID")
  .argument("<delivery-id>", "Delivery ID")
  .description("Update a document delivery. Prefer project-local allowlisted CLIs for production writes.")
  .option("--payload <json>", "JSON delivery payload")
  .option("--payload-file <file>", "Read JSON delivery payload from a file")
  .action(async (documentId, deliveryId, options) => {
    const payload = parseDeliveryUpdateRequest(await readJsonPayload(options.payload, options.payloadFile));
    printJson(await clientFromOptions(program.opts()).updateDocumentDelivery(documentId, deliveryId, payload));
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

const routeDeliveries = routes
  .command("deliveries")
  .description("List, create, or update data route deliveries")
  .argument("[id]", "Route ID")
  .action(async (id) => {
    if (!id) {
      routeDeliveries.help({ error: true });
    }
    printJson(await clientFromOptions(program.opts()).getRouteDeliveries(id));
  });

routeDeliveries
  .command("list")
  .argument("<id>", "Route ID")
  .action(async (id) => {
    printJson(await clientFromOptions(program.opts()).getRouteDeliveries(id));
  });

routeDeliveries
  .command("create")
  .argument("<id>", "Route ID")
  .description("Create a data route delivery. Prefer project-local allowlisted CLIs for production writes.")
  .option("--payload <json>", "JSON delivery payload")
  .option("--payload-file <file>", "Read JSON delivery payload from a file")
  .action(async (id, options) => {
    const payload = parseDeliveryCreateRequest(await readJsonPayload(options.payload, options.payloadFile));
    printJson(await clientFromOptions(program.opts()).createRouteDelivery(id, payload));
  });

routeDeliveries
  .command("update")
  .argument("<route-id>", "Route ID")
  .argument("<delivery-id>", "Delivery ID")
  .description("Update a data route delivery. Prefer project-local allowlisted CLIs for production writes.")
  .option("--payload <json>", "JSON delivery payload")
  .option("--payload-file <file>", "Read JSON delivery payload from a file")
  .action(async (routeId, deliveryId, options) => {
    const payload = parseDeliveryUpdateRequest(await readJsonPayload(options.payload, options.payloadFile));
    printJson(await clientFromOptions(program.opts()).updateRouteDelivery(routeId, deliveryId, payload));
  });

const tools = program.command("tools").description("Run non-account-mutating file tools");

tools
  .command("combine")
  .requiredOption("--payload <json>", "JSON payload with output and files")
  .option("--out <file>", "Write binary result to a file")
  .action(async (options) => {
    const payload = combineFilesSchema.parse(parseJson(options.payload));
    const result = await clientFromOptions(program.opts()).combineFiles(payload);
    await writeBinary(result, options.out);
  });

tools
  .command("convert-to-pdf")
  .requiredOption("--payload <json>", "JSON payload with file")
  .option("--out <file>", "Write PDF result to a file")
  .action(async (options) => {
    const payload = singleFileToolSchema.parse(parseJson(options.payload));
    const result = await clientFromOptions(program.opts()).convertToPdf(payload);
    await writeBinary(result, options.out);
  });

tools
  .command("compress-pdf")
  .requiredOption("--payload <json>", "JSON payload with file")
  .option("--out <file>", "Write PDF result to a file")
  .action(async (options) => {
    const payload = singleFileToolSchema.parse(parseJson(options.payload));
    const result = await clientFromOptions(program.opts()).compressPdf(payload);
    await writeBinary(result, options.out);
  });

tools
  .command("encrypt-pdf")
  .requiredOption("--payload <json>", "JSON payload with file, password, and optional permissions")
  .option("--out <file>", "Write PDF result to a file")
  .action(async (options) => {
    const payload = encryptPdfSchema.parse(parseJson(options.payload));
    const result = await clientFromOptions(program.opts()).encryptPdf(payload);
    await writeBinary(result, options.out);
  });

tools
  .command("split-pdf")
  .requiredOption("--payload <json>", "JSON payload with file and optional extract/remove ranges")
  .option("--out <file>", "Write ZIP result to a file")
  .action(async (options) => {
    const payload = splitPdfSchema.parse(parseJson(options.payload));
    const result = await clientFromOptions(program.opts()).splitPdf(payload);
    await writeBinary(result, options.out);
  });

program.parseAsync().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
