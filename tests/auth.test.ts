import assert from "node:assert/strict";
import { test } from "node:test";
import type { Request } from "express";
import { credentialsFromRequest } from "../src/auth.js";
import { CredentialsError } from "../src/errors.js";
import { parseServerConfig } from "../src/server-config.schema.js";

function requestWithHeaders(headers: Record<string, string> = {}): Request {
  const normalized = new Map(Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value]));
  return {
    header(name: string) {
      return normalized.get(name.toLowerCase());
    }
  } as Request;
}

const environment = {
  WEBMERGE_API_KEY: "environment-key",
  WEBMERGE_API_SECRET: "environment-secret"
};

test("request credentials take precedence over environment credentials", () => {
  assert.deepEqual(
    credentialsFromRequest(
      requestWithHeaders({
        "x-webmerge-api-key": "request-key",
        "x-webmerge-api-secret": "request-secret"
      }),
      { allowEnvironmentFallback: true, environment }
    ),
    { apiKey: "request-key", apiSecret: "request-secret" }
  );
});

test("partial or malformed request credentials fail closed", () => {
  assert.throws(
    () =>
      credentialsFromRequest(requestWithHeaders({ "x-webmerge-api-key": "request-key" }), {
        allowEnvironmentFallback: true,
        environment
      }),
    CredentialsError
  );
  assert.throws(
    () =>
      credentialsFromRequest(requestWithHeaders({ authorization: "Basic a2V5Og==" }), {
        allowEnvironmentFallback: true,
        environment
      }),
    CredentialsError
  );
});

test("environment fallback is explicit", () => {
  assert.deepEqual(credentialsFromRequest(requestWithHeaders(), { allowEnvironmentFallback: true, environment }), {
    apiKey: "environment-key",
    apiSecret: "environment-secret"
  });
  assert.throws(
    () => credentialsFromRequest(requestWithHeaders(), { allowEnvironmentFallback: false, environment }),
    CredentialsError
  );
});

test("server configuration is loopback-safe", () => {
  assert.deepEqual(parseServerConfig({}), {
    host: "127.0.0.1",
    port: 3000,
    allowEnvironmentCredentialFallback: true
  });
  assert.throws(() =>
    parseServerConfig({
      HOST: "0.0.0.0",
      ALLOW_ENV_CREDENTIAL_FALLBACK: "true"
    })
  );
  assert.deepEqual(
    parseServerConfig({
      HOST: "0.0.0.0",
      PORT: "4321",
      ALLOW_ENV_CREDENTIAL_FALLBACK: "false"
    }),
    {
      host: "0.0.0.0",
      port: 4321,
      allowEnvironmentCredentialFallback: false
    }
  );
});
