import type { Hono } from "hono";
import type { WebmergeClient } from "../client.js";

export interface ConnectorVariables {
  webmergeClient: WebmergeClient;
}

export interface ConnectorEnvironment {
  Variables: ConnectorVariables;
}

export interface CreateAppOptions {
  allowEnvironmentCredentialFallback?: boolean;
  clientFactory?: (request: Request) => WebmergeClient;
}

export type ConnectorApp = Hono<ConnectorEnvironment>;
