import type { MiddlewareHandler } from "hono";
import { createMiddleware } from "hono/factory";
import { credentialsFromHeaders } from "../auth.js";
import { WebmergeClient } from "../client.js";
import type { ConnectorEnvironment, CreateAppOptions } from "./app.types.js";

export function createClientMiddleware(
  options: CreateAppOptions = {}
): MiddlewareHandler<ConnectorEnvironment> {
  return createMiddleware<ConnectorEnvironment>(async (context, next) => {
    const request = context.req.raw;
    const client =
      options.clientFactory?.(request) ??
      new WebmergeClient({
        ...credentialsFromHeaders(request.headers, {
          allowEnvironmentFallback: options.allowEnvironmentCredentialFallback ?? false
        }),
        baseUrl: process.env.WEBMERGE_BASE_URL
      });

    context.set("webmergeClient", client);
    await next();
  });
}
