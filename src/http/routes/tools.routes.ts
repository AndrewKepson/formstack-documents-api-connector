import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import {
  combineFilesSchema,
  encryptPdfSchema,
  singleFileToolSchema,
  splitPdfSchema
} from "../../contracts.schema.js";
import type { BinaryResponse } from "../../contracts.types.js";
import type { ConnectorEnvironment } from "../app.types.js";
import { validationHook } from "../validation.js";

const MAX_TOOL_BODY_BYTES = 25 * 1024 * 1024;

function binaryResponse(result: BinaryResponse): Response {
  const headers = new Headers({ "content-type": result.contentType });
  if (result.contentDisposition) {
    headers.set("content-disposition", result.contentDisposition);
  }

  return new Response(new Uint8Array(result.body), { headers });
}

export function createToolRoutes(): Hono<ConnectorEnvironment> {
  const routes = new Hono<ConnectorEnvironment>();

  routes.use(
    "/tools/*",
    bodyLimit({
      maxSize: MAX_TOOL_BODY_BYTES,
      onError: (context) => context.json({ status: 413, message: "Request body too large" }, 413)
    })
  );

  routes.post("/tools/combine", zValidator("json", combineFilesSchema, validationHook), async (context) =>
    binaryResponse(await context.get("webmergeClient").combineFiles(context.req.valid("json")))
  );

  routes.post("/tools/convert-to-pdf", zValidator("json", singleFileToolSchema, validationHook), async (context) =>
    binaryResponse(await context.get("webmergeClient").convertToPdf(context.req.valid("json")))
  );

  routes.post("/tools/compress-pdf", zValidator("json", singleFileToolSchema, validationHook), async (context) =>
    binaryResponse(await context.get("webmergeClient").compressPdf(context.req.valid("json")))
  );

  routes.post("/tools/encrypt-pdf", zValidator("json", encryptPdfSchema, validationHook), async (context) =>
    binaryResponse(await context.get("webmergeClient").encryptPdf(context.req.valid("json")))
  );

  routes.post("/tools/split-pdf", zValidator("json", splitPdfSchema, validationHook), async (context) =>
    binaryResponse(await context.get("webmergeClient").splitPdf(context.req.valid("json")))
  );

  return routes;
}
