import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { documentListQuerySchema, fieldsQuerySchema } from "../../contracts.schema.js";
import type { ConnectorEnvironment } from "../app.types.js";
import { validationHook } from "../validation.js";

export function createDocumentRoutes(): Hono<ConnectorEnvironment> {
  const routes = new Hono<ConnectorEnvironment>();

  routes.get("/documents", zValidator("query", documentListQuerySchema, validationHook), async (context) => {
    const query = context.req.valid("query");
    return context.json(await context.get("webmergeClient").listDocuments(query));
  });

  routes.get("/documents/:id", async (context) =>
    context.json(await context.get("webmergeClient").getDocument(context.req.param("id")))
  );

  routes.get(
    "/documents/:id/fields",
    zValidator("query", fieldsQuerySchema, validationHook),
    async (context) => {
      const query = context.req.valid("query");
      return context.json(await context.get("webmergeClient").getDocumentFields(context.req.param("id"), query));
    }
  );

  routes.get("/documents/:id/file", async (context) =>
    context.json(await context.get("webmergeClient").getDocumentFile(context.req.param("id")))
  );

  routes.get("/documents/:id/deliveries", async (context) =>
    context.json(await context.get("webmergeClient").getDocumentDeliveries(context.req.param("id")))
  );

  return routes;
}
