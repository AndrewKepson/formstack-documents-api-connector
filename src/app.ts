import express, { type NextFunction, type Request, type Response } from "express";
import { ZodError, type ZodType } from "zod";
import { credentialsFromRequest } from "./auth.js";
import { CredentialsError, WebmergeApiError } from "./errors.js";
import {
  combineFilesSchema,
  documentListQuerySchema,
  encryptPdfSchema,
  fieldsQuerySchema,
  singleFileToolSchema,
  splitPdfSchema
} from "./contracts.schema.js";
import { WebmergeClient } from "./client.js";
import type { BinaryResponse } from "./contracts.types.js";

export interface CreateAppOptions {
  allowEnvironmentCredentialFallback?: boolean;
  clientFactory?: (req: Request) => WebmergeClient;
}

function clientFor(req: Request, allowEnvironmentFallback: boolean): WebmergeClient {
  return new WebmergeClient({
    ...credentialsFromRequest(req, { allowEnvironmentFallback }),
    baseUrl: process.env.WEBMERGE_BASE_URL
  });
}

function parseBody<T>(schema: ZodType<T>, body: unknown): T {
  return schema.parse(body);
}

function sendBinary(res: Response, result: BinaryResponse): void {
  res.type(result.contentType);
  if (result.contentDisposition) {
    res.setHeader("content-disposition", result.contentDisposition);
  }
  res.send(result.body);
}

export function createApp(options: CreateAppOptions = {}): express.Express {
  const app = express();
  const createClient =
    options.clientFactory ??
    ((req: Request) => clientFor(req, options.allowEnvironmentCredentialFallback ?? false));

  app.use(express.json({ limit: "25mb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "formstack-documents-api-connector" });
  });

  app.get("/api/documents", async (req, res, next) => {
    try {
      const query = documentListQuerySchema.parse(req.query);
      res.json(await createClient(req).listDocuments(query));
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/documents/folders", async (req, res, next) => {
    try {
      res.json(await createClient(req).listDocumentFolders());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/folders", async (req, res, next) => {
    try {
      res.json(await createClient(req).listFolders());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/documents/:id", async (req, res, next) => {
    try {
      res.json(await createClient(req).getDocument(req.params.id));
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/documents/:id/fields", async (req, res, next) => {
    try {
      const query = fieldsQuerySchema.parse(req.query);
      res.json(await createClient(req).getDocumentFields(req.params.id, query));
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/documents/:id/file", async (req, res, next) => {
    try {
      res.json(await createClient(req).getDocumentFile(req.params.id));
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/documents/:id/deliveries", async (req, res, next) => {
    try {
      res.json(await createClient(req).getDocumentDeliveries(req.params.id));
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/routes", async (req, res, next) => {
    try {
      res.json(await createClient(req).listRoutes());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/routes/:id", async (req, res, next) => {
    try {
      res.json(await createClient(req).getRoute(req.params.id));
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/routes/:id/fields", async (req, res, next) => {
    try {
      res.json(await createClient(req).getRouteFields(req.params.id));
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/routes/:id/rules", async (req, res, next) => {
    try {
      res.json(await createClient(req).getRouteRules(req.params.id));
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/routes/:id/deliveries", async (req, res, next) => {
    try {
      res.json(await createClient(req).getRouteDeliveries(req.params.id));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/tools/combine", async (req, res, next) => {
    try {
      sendBinary(res, await createClient(req).combineFiles(parseBody(combineFilesSchema, req.body)));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/tools/convert-to-pdf", async (req, res, next) => {
    try {
      sendBinary(res, await createClient(req).convertToPdf(parseBody(singleFileToolSchema, req.body)));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/tools/compress-pdf", async (req, res, next) => {
    try {
      sendBinary(res, await createClient(req).compressPdf(parseBody(singleFileToolSchema, req.body)));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/tools/encrypt-pdf", async (req, res, next) => {
    try {
      sendBinary(res, await createClient(req).encryptPdf(parseBody(encryptPdfSchema, req.body)));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/tools/split-pdf", async (req, res, next) => {
    try {
      sendBinary(res, await createClient(req).splitPdf(parseBody(splitPdfSchema, req.body)));
    } catch (error) {
      next(error);
    }
  });

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof ZodError) {
      res.status(400).json({
        status: 400,
        message: "Invalid request",
        details: error.issues
      });
      return;
    }

    if (error instanceof CredentialsError) {
      res.status(401).json({ status: 401, message: error.message });
      return;
    }

    if (error instanceof WebmergeApiError) {
      res.status(error.status).json(error.toJSON());
      return;
    }

    res.status(500).json({
      status: 500,
      message: error instanceof Error ? error.message : "Unexpected error"
    });
  });

  return app;
}
