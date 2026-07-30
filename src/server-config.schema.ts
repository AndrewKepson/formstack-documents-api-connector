import { z } from "zod";

const booleanEnvironmentValueSchema = z
  .enum(["true", "false", "1", "0"])
  .default("true")
  .transform((value) => value === "true" || value === "1");

const serverEnvironmentSchema = z.object({
  HOST: z.string().min(1).default("127.0.0.1"),
  PORT: z.coerce.number().int().min(0).max(65_535).default(3000),
  ALLOW_ENV_CREDENTIAL_FALLBACK: booleanEnvironmentValueSchema
});

export interface ServerConfig {
  host: string;
  port: number;
  allowEnvironmentCredentialFallback: boolean;
}

function isLoopbackHost(host: string): boolean {
  return host === "127.0.0.1" || host === "::1" || host === "localhost";
}

export function parseServerConfig(environment: NodeJS.ProcessEnv = process.env): ServerConfig {
  const parsed = serverEnvironmentSchema.parse(environment);

  if (parsed.ALLOW_ENV_CREDENTIAL_FALLBACK && !isLoopbackHost(parsed.HOST)) {
    throw new Error("Environment credential fallback is only allowed when HOST is loopback");
  }

  return {
    host: parsed.HOST,
    port: parsed.PORT,
    allowEnvironmentCredentialFallback: parsed.ALLOW_ENV_CREDENTIAL_FALLBACK
  };
}
