import type { Request } from "express";
import { CredentialsError } from "./errors.js";
import type { WebmergeCredentials } from "./types.js";

export interface CredentialResolutionOptions {
  allowEnvironmentFallback?: boolean;
  environment?: NodeJS.ProcessEnv;
}

export function credentialsFromRequest(
  req: Request,
  options: CredentialResolutionOptions = {}
): WebmergeCredentials {
  const headerKey = req.header("x-webmerge-api-key") ?? req.header("x-formstack-documents-api-key");
  const headerSecret = req.header("x-webmerge-api-secret") ?? req.header("x-formstack-documents-api-secret");

  if (headerKey || headerSecret) {
    if (!headerKey || !headerSecret) {
      throw new CredentialsError("Provide both the Formstack Documents API key and secret headers");
    }

    return { apiKey: headerKey, apiSecret: headerSecret };
  }

  const basic = req.header("authorization");
  if (basic) {
    if (!basic.startsWith("Basic ")) {
      throw new CredentialsError("Authorization must use Basic authentication");
    }

    const decoded = Buffer.from(basic.slice("Basic ".length), "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    const apiKey = decoded.slice(0, separator);
    const apiSecret = decoded.slice(separator + 1);
    if (separator <= 0 || !apiSecret) {
      throw new CredentialsError("Basic authentication must contain a non-empty API key and secret");
    }

    return { apiKey, apiSecret };
  }

  const environment = options.environment ?? process.env;
  if (options.allowEnvironmentFallback && environment.WEBMERGE_API_KEY && environment.WEBMERGE_API_SECRET) {
    return {
      apiKey: environment.WEBMERGE_API_KEY,
      apiSecret: environment.WEBMERGE_API_SECRET
    };
  }

  throw new CredentialsError(
    options.allowEnvironmentFallback
      ? "Provide credentials via x-webmerge-api-key/x-webmerge-api-secret, Basic auth, or WEBMERGE_API_KEY/WEBMERGE_API_SECRET"
      : "Provide credentials via x-webmerge-api-key/x-webmerge-api-secret or Basic auth"
  );
}
