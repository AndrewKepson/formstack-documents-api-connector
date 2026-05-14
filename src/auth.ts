import type { Request } from "express";
import { CredentialsError } from "./errors.js";
import type { WebmergeCredentials } from "./types.js";

export function credentialsFromRequest(req: Request): WebmergeCredentials {
  const headerKey = req.header("x-webmerge-api-key") ?? req.header("x-formstack-documents-api-key");
  const headerSecret = req.header("x-webmerge-api-secret") ?? req.header("x-formstack-documents-api-secret");

  if (headerKey && headerSecret) {
    return { apiKey: headerKey, apiSecret: headerSecret };
  }

  const basic = req.header("authorization");
  if (basic?.startsWith("Basic ")) {
    const decoded = Buffer.from(basic.slice("Basic ".length), "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator > 0) {
      return {
        apiKey: decoded.slice(0, separator),
        apiSecret: decoded.slice(separator + 1)
      };
    }
  }

  if (process.env.WEBMERGE_API_KEY && process.env.WEBMERGE_API_SECRET) {
    return {
      apiKey: process.env.WEBMERGE_API_KEY,
      apiSecret: process.env.WEBMERGE_API_SECRET
    };
  }

  throw new CredentialsError(
    "Provide credentials via x-webmerge-api-key/x-webmerge-api-secret, Basic auth, or WEBMERGE_API_KEY/WEBMERGE_API_SECRET"
  );
}
