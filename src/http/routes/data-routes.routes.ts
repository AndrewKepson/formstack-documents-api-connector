import { Hono } from "hono";
import type { ConnectorEnvironment } from "../app.types.js";

export function createDataRouteRoutes(): Hono<ConnectorEnvironment> {
  const routes = new Hono<ConnectorEnvironment>();

  routes.get("/routes", async (context) =>
    context.json(await context.get("webmergeClient").listRoutes())
  );

  routes.get("/routes/:id", async (context) =>
    context.json(await context.get("webmergeClient").getRoute(context.req.param("id")))
  );

  routes.get("/routes/:id/fields", async (context) =>
    context.json(await context.get("webmergeClient").getRouteFields(context.req.param("id")))
  );

  routes.get("/routes/:id/rules", async (context) =>
    context.json(await context.get("webmergeClient").getRouteRules(context.req.param("id")))
  );

  routes.get("/routes/:id/deliveries", async (context) =>
    context.json(await context.get("webmergeClient").getRouteDeliveries(context.req.param("id")))
  );

  return routes;
}
