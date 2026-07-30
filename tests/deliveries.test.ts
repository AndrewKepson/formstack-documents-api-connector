import assert from "node:assert/strict";
import { test } from "node:test";
import { WebmergeClient } from "../src/client.js";
import {
  parseDeliveryCreateRequest,
  parseDeliveryUpdateRequest,
  parseDeliveryWriteRequest
} from "../src/deliveries.schema.js";
import type { DeliveryWriteRequest, WebmergeDelivery } from "../src/contracts.types.js";

type CapturedRequest = {
  url: string;
  method: string;
  contentType: string | null;
  body: unknown;
};

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}

function createMockFetch() {
  const requests: CapturedRequest[] = [];

  const fetchImpl: typeof fetch = async (input, init = {}) => {
    const url = String(input);
    const headers = new Headers(init.headers);
    const request: CapturedRequest = {
      url,
      method: init.method ?? "GET",
      contentType: headers.get("content-type"),
      body: init.body ? JSON.parse(String(init.body)) : undefined
    };
    requests.push(request);

    if (url.endsWith("/api/documents/doc-1/deliveries") && request.method === "POST") {
      return jsonResponse({
        id: "document-delivery-1",
        type: "webhook",
        settings: request.body?.["settings"] ?? {}
      } satisfies WebmergeDelivery);
    }

    if (url.endsWith("/api/documents/doc-1/deliveries/document-delivery-1") && request.method === "PUT") {
      return jsonResponse({
        id: "document-delivery-1",
        type: "webhook",
        settings: request.body?.["settings"] ?? {}
      } satisfies WebmergeDelivery);
    }

    if (url.endsWith("/api/routes/route-1/deliveries") && request.method === "POST") {
      return jsonResponse({
        id: "route-delivery-1",
        type: "webhook",
        settings: request.body?.["settings"] ?? {}
      } satisfies WebmergeDelivery);
    }

    if (url.endsWith("/api/routes/route-1/deliveries/route-delivery-1") && request.method === "PUT") {
      return jsonResponse({
        id: "route-delivery-1",
        type: "webhook",
        settings: request.body?.["settings"] ?? {}
      } satisfies WebmergeDelivery);
    }

    return new Response(JSON.stringify({ message: `Unhandled ${request.method} ${url}` }), {
      status: 404,
      headers: { "content-type": "application/json" }
    });
  };

  return { fetchImpl, requests };
}

test("creates and updates document and route webhook deliveries", async () => {
  const { fetchImpl, requests } = createMockFetch();
  const client = new WebmergeClient({
    apiKey: "test-key",
    apiSecret: "test-secret",
    baseUrl: "https://www.webmerge.test",
    fetch: fetchImpl
  });
  const payload: DeliveryWriteRequest = {
    type: "webhook",
    name: "Local Documents Webhook",
    active: true,
    settings: {
      url: "https://example.ngrok-free.app/webhooks/account-servicing/documents",
      method: "POST",
      headers: {
        "x-test-source": "account-servicing"
      }
    }
  };

  const documentCreated = await client.createDocumentDelivery("doc-1", payload);
  const documentUpdated = await client.updateDocumentDelivery("doc-1", "document-delivery-1", payload);
  const routeCreated = await client.createRouteDelivery("route-1", payload);
  const routeUpdated = await client.updateRouteDelivery("route-1", "route-delivery-1", payload);

  assert.equal(documentCreated.id, "document-delivery-1");
  assert.equal(documentUpdated.id, "document-delivery-1");
  assert.equal(routeCreated.id, "route-delivery-1");
  assert.equal(routeUpdated.id, "route-delivery-1");
  assert.deepEqual(
    requests.map((request) => [request.method, new URL(request.url).pathname]),
    [
      ["POST", "/api/documents/doc-1/deliveries"],
      ["PUT", "/api/documents/doc-1/deliveries/document-delivery-1"],
      ["POST", "/api/routes/route-1/deliveries"],
      ["PUT", "/api/routes/route-1/deliveries/route-delivery-1"]
    ]
  );
  assert.deepEqual(
    requests.map((request) => request.body),
    [payload, payload, payload, payload]
  );
  assert.equal(requests[0]?.contentType, "application/json");
});

test("validates delivery write payloads at command boundaries", () => {
  assert.deepEqual(
    parseDeliveryWriteRequest({
      type: "webhook",
      settings: {
        url: "https://example.ngrok-free.app/webhooks/account-servicing/documents"
      }
    }),
    {
      type: "webhook",
      settings: {
        url: "https://example.ngrok-free.app/webhooks/account-servicing/documents"
      }
    }
  );

  assert.throws(() =>
    parseDeliveryWriteRequest({
      type: "email",
      settings: {
        url: "https://example.ngrok-free.app/webhooks/account-servicing/documents"
      }
    })
  );

  assert.throws(() =>
    parseDeliveryCreateRequest({
      type: "webhook",
      settings: {}
    })
  );

  assert.deepEqual(
    parseDeliveryUpdateRequest({
      type: "webhook",
      settings: {}
    }),
    {
      type: "webhook",
      settings: {}
    }
  );
});
