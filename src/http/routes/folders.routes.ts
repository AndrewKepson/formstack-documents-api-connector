import { Hono } from "hono";
import type { ConnectorEnvironment } from "../app.types.js";

export function createFolderRoutes(): Hono<ConnectorEnvironment> {
  const routes = new Hono<ConnectorEnvironment>();

  routes.get("/documents/folders", async (context) =>
    context.json(await context.get("webmergeClient").listDocumentFolders())
  );

  routes.get("/folders", async (context) =>
    context.json(await context.get("webmergeClient").listFolders())
  );

  return routes;
}
