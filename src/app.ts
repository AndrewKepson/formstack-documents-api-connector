import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { secureHeaders } from "hono/secure-headers";
import { ZodError } from "zod";
import { CredentialsError, WebmergeApiError } from "./errors.js";
import type { ConnectorApp, ConnectorEnvironment, CreateAppOptions } from "./http/app.types.js";
import { createClientMiddleware } from "./http/client.middleware.js";
import { createDataRouteRoutes } from "./http/routes/data-routes.routes.js";
import { createDocumentRoutes } from "./http/routes/documents.routes.js";
import { createFolderRoutes } from "./http/routes/folders.routes.js";
import { createToolRoutes } from "./http/routes/tools.routes.js";

export type { ConnectorApp, CreateAppOptions } from "./http/app.types.js";

export function createApp(options: CreateAppOptions = {}): ConnectorApp {
  const app = new Hono<ConnectorEnvironment>();

  app.use("*", secureHeaders({ strictTransportSecurity: false }));

  app.get("/health", (context) =>
    context.json({ ok: true, service: "formstack-documents-api-connector" })
  );

  app.use("/api/*", createClientMiddleware(options));
  app.route("/api", createFolderRoutes());
  app.route("/api", createDocumentRoutes());
  app.route("/api", createDataRouteRoutes());
  app.route("/api", createToolRoutes());

  app.notFound((context) => context.json({ status: 404, message: "Not found" }, 404));

  app.onError((error, context) => {
    if (error instanceof ZodError) {
      return context.json(
        {
          status: 400,
          message: "Invalid request",
          details: error.issues
        },
        400
      );
    }

    if ((error instanceof HTTPException && error.status === 400) || error instanceof SyntaxError) {
      return context.json(
        {
          status: 400,
          message: "Invalid request",
          details: [{ code: "invalid_json", path: [], message: "Malformed JSON request body" }]
        },
        400
      );
    }

    if (error instanceof CredentialsError) {
      return context.json({ status: 401, message: error.message }, 401);
    }

    if (error instanceof WebmergeApiError) {
      return new Response(JSON.stringify(error.toJSON()), {
        status: error.status,
        headers: { "content-type": "application/json; charset=UTF-8" }
      });
    }

    return context.json({ status: 500, message: "Internal server error" }, 500);
  });

  return app;
}
