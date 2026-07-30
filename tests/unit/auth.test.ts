import assert from "node:assert/strict";
import { test } from "node:test";
import { credentialsFromHeaders } from "../../src/auth.js";
import { CredentialsError } from "../../src/errors.js";
import { parseServerConfig } from "../../src/server-config.schema.js";

function headers(values: Record<string, string> = {}): Headers {
  return new Headers(values);
}

const environment = {
  WEBMERGE_API_KEY: "environment-key",
  WEBMERGE_API_SECRET: "environment-secret"
};

test("request credentials take precedence over environment credentials", () => {
  assert.deepEqual(
    credentialsFromHeaders(
      headers({
        "x-webmerge-api-key": "request-key",
        "x-webmerge-api-secret": "request-secret"
      }),
      { allowEnvironmentFallback: true, environment }
    ),
    { apiKey: "request-key", apiSecret: "request-secret" }
  );
});

test("Formstack header aliases and Basic authentication resolve credentials", () => {
  assert.deepEqual(
    credentialsFromHeaders(
      headers({
        "x-formstack-documents-api-key": "formstack-key",
        "x-formstack-documents-api-secret": "formstack-secret"
      })
    ),
    { apiKey: "formstack-key", apiSecret: "formstack-secret" }
  );
  assert.deepEqual(credentialsFromHeaders(headers({ authorization: "Basic a2V5OnNlY3JldA==" })), {
    apiKey: "key",
    apiSecret: "secret"
  });
});

test("partial or malformed request credentials fail closed", () => {
  assert.throws(
    () =>
      credentialsFromHeaders(headers({ "x-webmerge-api-key": "request-key" }), {
        allowEnvironmentFallback: true,
        environment
      }),
    CredentialsError
  );
  assert.throws(
    () =>
      credentialsFromHeaders(headers({ authorization: "Basic a2V5Og==" }), {
        allowEnvironmentFallback: true,
        environment
      }),
    CredentialsError
  );
  assert.throws(
    () => credentialsFromHeaders(headers({ authorization: "Bearer token" })),
    CredentialsError
  );
});

test("environment fallback is explicit", () => {
  assert.deepEqual(credentialsFromHeaders(headers(), { allowEnvironmentFallback: true, environment }), {
    apiKey: "environment-key",
    apiSecret: "environment-secret"
  });
  assert.throws(
    () => credentialsFromHeaders(headers(), { allowEnvironmentFallback: false, environment }),
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
