import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { WebmergeClient } from "./client.js";
import { fileInputSchema, idSchema, pdfPermissionSchema, toolOutputSchema } from "./contracts.schema.js";
import type { BinaryResponse } from "./contracts.types.js";

const idInput = idSchema;

const verificationSchema = {
  confirmed: z
    .boolean()
    .optional()
    .describe("Must be true after explicit user verification for this non-read-only action."),
  verificationNote: z
    .string()
    .min(1)
    .optional()
    .describe("Short note describing what the user verified before this call.")
};

function jsonContent(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(value, null, 2)
      }
    ]
  };
}

function binaryContent(result: BinaryResponse) {
  return jsonContent({
    contentType: result.contentType,
    contentDisposition: result.contentDisposition,
    bytes: result.body.length,
    base64: result.body.toString("base64")
  });
}

function assertVerified(args: { confirmed?: boolean; verificationNote?: string }): void {
  if (args.confirmed !== true || !args.verificationNote?.trim()) {
    throw new Error(
      "This non-read-only tool requires explicit user verification. Re-run with confirmed=true and verificationNote describing the user's approval."
    );
  }
}

export interface CreateMcpServerOptions {
  client?: WebmergeClient;
}

export function createMcpServer(options: CreateMcpServerOptions = {}): McpServer {
  const client = options.client ?? new WebmergeClient();
  const server = new McpServer({
    name: "formstack-documents-api-connector",
    version: "1.0.0"
  });

  server.registerTool(
    "list_documents",
    {
      title: "List Documents",
      description: "List Formstack Documents templates, optionally filtered by search term or folder.",
      inputSchema: {
        search: z.string().min(1).optional(),
        folder: z.string().min(1).optional()
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async (args) => jsonContent(await client.listDocuments(args))
  );

  server.registerTool(
    "list_document_folders",
    {
      title: "List Document Folders",
      description:
        "List Formstack Documents folders. The API returns folder IDs and leaf names, not full nested folder paths.",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async () => jsonContent(await client.listDocumentFolders())
  );

  server.registerTool(
    "get_document",
    {
      title: "Get Document",
      description: "Get details for a single Formstack Documents template.",
      inputSchema: { id: idInput },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async ({ id }) => jsonContent(await client.getDocument(id))
  );

  server.registerTool(
    "get_document_fields",
    {
      title: "Get Document Fields",
      description: "Get merge fields for a single document.",
      inputSchema: {
        id: idInput,
        attributes: z.boolean().optional().describe("Include all field attributes when true.")
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async ({ id, attributes }) => jsonContent(await client.getDocumentFields(id, { attributes }))
  );

  server.registerTool(
    "get_document_file",
    {
      title: "Get Document File",
      description: "Get the uploaded file metadata and base64 contents for a document.",
      inputSchema: { id: idInput },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async ({ id }) => jsonContent(await client.getDocumentFile(id))
  );

  server.registerTool(
    "get_document_deliveries",
    {
      title: "Get Document Deliveries",
      description: "List configured deliveries for a document.",
      inputSchema: { id: idInput },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async ({ id }) => jsonContent(await client.getDocumentDeliveries(id))
  );

  server.registerTool(
    "list_routes",
    {
      title: "List Data Routes",
      description: "List Formstack Documents data routes.",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async () => jsonContent(await client.listRoutes())
  );

  server.registerTool(
    "get_route",
    {
      title: "Get Data Route",
      description: "Get details for a single data route.",
      inputSchema: { id: idInput },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async ({ id }) => jsonContent(await client.getRoute(id))
  );

  server.registerTool(
    "get_route_fields",
    {
      title: "Get Data Route Fields",
      description: "Get merge fields for all documents in a route.",
      inputSchema: { id: idInput },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async ({ id }) => jsonContent(await client.getRouteFields(id))
  );

  server.registerTool(
    "get_route_rules",
    {
      title: "Get Data Route Rules",
      description: "List routing rules for a data route.",
      inputSchema: { id: idInput },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async ({ id }) => jsonContent(await client.getRouteRules(id))
  );

  server.registerTool(
    "get_route_deliveries",
    {
      title: "Get Data Route Deliveries",
      description: "List configured deliveries for a data route.",
      inputSchema: { id: idInput },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async ({ id }) => jsonContent(await client.getRouteDeliveries(id))
  );

  server.registerTool(
    "combine_files",
    {
      title: "Combine Files",
      description:
        "Combine files into a PDF or DOCX. Requires explicit user verification because it sends file data to the API.",
      inputSchema: {
        output: toolOutputSchema,
        files: z.array(fileInputSchema).min(1),
        ...verificationSchema
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
    },
    async (args) => {
      assertVerified(args);
      return binaryContent(await client.combineFiles(args));
    }
  );

  server.registerTool(
    "convert_to_pdf",
    {
      title: "Convert File to PDF",
      description: "Convert a file to PDF. Requires explicit user verification because it sends file data to the API.",
      inputSchema: {
        file: fileInputSchema,
        ...verificationSchema
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
    },
    async (args) => {
      assertVerified(args);
      return binaryContent(await client.convertToPdf(args));
    }
  );

  server.registerTool(
    "compress_pdf",
    {
      title: "Compress PDF",
      description: "Compress a PDF. Requires explicit user verification because it sends file data to the API.",
      inputSchema: {
        file: fileInputSchema,
        ...verificationSchema
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
    },
    async (args) => {
      assertVerified(args);
      return binaryContent(await client.compressPdf(args));
    }
  );

  server.registerTool(
    "encrypt_pdf",
    {
      title: "Encrypt PDF",
      description: "Encrypt a PDF. Requires explicit user verification because it sends file data to the API.",
      inputSchema: {
        file: fileInputSchema,
        password: z.string().min(1),
        user_password: z.string().min(1).optional(),
        permissions: z.array(pdfPermissionSchema).optional(),
        ...verificationSchema
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
    },
    async (args) => {
      assertVerified(args);
      return binaryContent(await client.encryptPdf(args));
    }
  );

  server.registerTool(
    "split_pdf",
    {
      title: "Split PDF",
      description: "Split, extract, or remove pages from a PDF output. Requires explicit user verification.",
      inputSchema: {
        file: fileInputSchema,
        extract: z.string().min(1).optional(),
        remove: z.string().min(1).optional(),
        ...verificationSchema
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
    },
    async (args) => {
      assertVerified(args);
      return binaryContent(await client.splitPdf(args));
    }
  );

  return server;
}
