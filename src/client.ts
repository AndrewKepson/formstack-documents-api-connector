import { ZodError, type ZodType } from "zod";
import {
  webmergeDeliveriesSchema,
  webmergeDeliverySchema,
  webmergeDocumentFileSchema,
  webmergeDocumentSchema,
  webmergeDocumentsSchema,
  webmergeFieldsSchema,
  webmergeFoldersSchema,
  webmergeRouteRulesSchema,
  webmergeRouteSchema,
  webmergeRoutesSchema
} from "./contracts.schema.js";
import { CredentialsError, WebmergeApiError } from "./errors.js";
import type {
  BinaryResponse,
  CombineFilesRequest,
  CreateDocumentRequest,
  DeliveryWriteRequest,
  DocumentMergeOptions,
  DocumentMergePayload,
  DocumentFieldsParams,
  DocumentListParams,
  EncryptPdfRequest,
  SingleFileToolRequest,
  SplitPdfRequest,
  UpdateDocumentRequest,
  WebmergeClientOptions,
  WebmergeCredentials,
  WebmergeDelivery,
  WebmergeDeliveryListItem,
  WebmergeDocument,
  WebmergeDocumentFile,
  WebmergeField,
  WebmergeFolder,
  WebmergeId,
  WebmergeRoute,
  WebmergeRouteRule
} from "./contracts.types.js";

const DEFAULT_BASE_URL = "https://www.webmerge.me";

type RequestOptions = {
  query?: Record<string, unknown>;
  body?: unknown;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  authenticated?: boolean;
};

export class WebmergeClient {
  private readonly apiKey?: string;
  private readonly apiSecret?: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: WebmergeClientOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.WEBMERGE_API_KEY;
    this.apiSecret = options.apiSecret ?? process.env.WEBMERGE_API_SECRET;
    this.baseUrl = (options.baseUrl ?? process.env.WEBMERGE_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.fetchImpl = options.fetch ?? fetch;
  }

  listDocuments(params: DocumentListParams = {}): Promise<WebmergeDocument[]> {
    return this.requestJson("/api/documents", webmergeDocumentsSchema, {
      query: { search: params.search, folder: params.folder }
    });
  }

  listFolders(): Promise<WebmergeFolder[]> {
    return this.requestJson("/api/folders", webmergeFoldersSchema);
  }

  listDocumentFolders(): Promise<WebmergeFolder[]> {
    return this.requestJson("/api/folders/documents", webmergeFoldersSchema);
  }

  getDocument(id: WebmergeId): Promise<WebmergeDocument> {
    return this.requestJson(`/api/documents/${encodeURIComponent(String(id))}`, webmergeDocumentSchema);
  }

  createDocument(payload: CreateDocumentRequest): Promise<WebmergeDocument> {
    return this.requestJson("/api/documents", webmergeDocumentSchema, {
      method: "POST",
      body: payload
    });
  }

  updateDocument(id: WebmergeId, payload: UpdateDocumentRequest): Promise<WebmergeDocument> {
    return this.requestJson(`/api/documents/${encodeURIComponent(String(id))}`, webmergeDocumentSchema, {
      method: "PUT",
      body: payload
    });
  }

  getDocumentFields(id: WebmergeId, params: DocumentFieldsParams = {}): Promise<WebmergeField[]> {
    return this.requestJson(`/api/documents/${encodeURIComponent(String(id))}/fields`, webmergeFieldsSchema, {
      query: { attributes: params.attributes ? 1 : undefined }
    });
  }

  getDocumentFile(id: WebmergeId): Promise<WebmergeDocumentFile> {
    return this.requestJson(`/api/documents/${encodeURIComponent(String(id))}/file`, webmergeDocumentFileSchema);
  }

  mergeDocument(
    id: WebmergeId,
    documentKey: string,
    payload: DocumentMergePayload,
    options: DocumentMergeOptions = {}
  ): Promise<BinaryResponse> {
    return this.requestBinary(
      `/merge/${encodeURIComponent(String(id))}/${encodeURIComponent(documentKey)}`,
      {
        method: "POST",
        query: {
          download: 1,
          test: options.test === false ? undefined : 1
        },
        body: payload,
        authenticated: false
      }
    );
  }

  getDocumentDeliveries(id: WebmergeId): Promise<WebmergeDeliveryListItem[]> {
    return this.requestJson(`/api/documents/${encodeURIComponent(String(id))}/deliveries`, webmergeDeliveriesSchema);
  }

  createDocumentDelivery(id: WebmergeId, payload: DeliveryWriteRequest): Promise<WebmergeDelivery> {
    return this.requestJson(`/api/documents/${encodeURIComponent(String(id))}/deliveries`, webmergeDeliverySchema, {
      method: "POST",
      body: payload
    });
  }

  updateDocumentDelivery(
    documentId: WebmergeId,
    deliveryId: WebmergeId,
    payload: DeliveryWriteRequest
  ): Promise<WebmergeDelivery> {
    return this.requestJson(
      `/api/documents/${encodeURIComponent(String(documentId))}/deliveries/${encodeURIComponent(String(deliveryId))}`,
      webmergeDeliverySchema,
      {
        method: "PUT",
        body: payload
      }
    );
  }

  listRoutes(): Promise<WebmergeRoute[]> {
    return this.requestJson("/api/routes", webmergeRoutesSchema);
  }

  getRoute(id: WebmergeId): Promise<WebmergeRoute> {
    return this.requestJson(`/api/routes/${encodeURIComponent(String(id))}`, webmergeRouteSchema);
  }

  getRouteFields(id: WebmergeId): Promise<WebmergeField[]> {
    return this.requestJson(`/api/routes/${encodeURIComponent(String(id))}/fields`, webmergeFieldsSchema);
  }

  getRouteRules(id: WebmergeId): Promise<WebmergeRouteRule[]> {
    return this.requestJson(`/api/routes/${encodeURIComponent(String(id))}/rules`, webmergeRouteRulesSchema);
  }

  getRouteDeliveries(id: WebmergeId): Promise<WebmergeDeliveryListItem[]> {
    return this.requestJson(`/api/routes/${encodeURIComponent(String(id))}/deliveries`, webmergeDeliveriesSchema);
  }

  createRouteDelivery(id: WebmergeId, payload: DeliveryWriteRequest): Promise<WebmergeDelivery> {
    return this.requestJson(`/api/routes/${encodeURIComponent(String(id))}/deliveries`, webmergeDeliverySchema, {
      method: "POST",
      body: payload
    });
  }

  updateRouteDelivery(routeId: WebmergeId, deliveryId: WebmergeId, payload: DeliveryWriteRequest): Promise<WebmergeDelivery> {
    return this.requestJson(
      `/api/routes/${encodeURIComponent(String(routeId))}/deliveries/${encodeURIComponent(String(deliveryId))}`,
      webmergeDeliverySchema,
      {
        method: "PUT",
        body: payload
      }
    );
  }

  combineFiles(payload: CombineFilesRequest): Promise<BinaryResponse> {
    return this.requestBinary("/api/tools/combine", { body: payload });
  }

  convertToPdf(payload: SingleFileToolRequest): Promise<BinaryResponse> {
    return this.requestBinary("/api/tools/convert_to_pdf", { body: payload });
  }

  compressPdf(payload: SingleFileToolRequest): Promise<BinaryResponse> {
    return this.requestBinary("/api/tools/compress_pdf", { body: payload });
  }

  encryptPdf(payload: EncryptPdfRequest): Promise<BinaryResponse> {
    return this.requestBinary("/api/tools/encrypt_pdf", { body: payload });
  }

  splitPdf(payload: SplitPdfRequest): Promise<BinaryResponse> {
    return this.requestBinary("/api/tools/split_pdf", { body: payload });
  }

  private getCredentials(): WebmergeCredentials {
    if (!this.apiKey || !this.apiSecret) {
      throw new CredentialsError();
    }

    return {
      apiKey: this.apiKey,
      apiSecret: this.apiSecret
    };
  }

  private async requestJson<T>(path: string, schema: ZodType<T>, options: RequestOptions = {}): Promise<T> {
    const response = await this.request(path, options);
    const contentType = response.headers.get("content-type") ?? "";

    if (!contentType.includes("application/json")) {
      const text = await response.text();
      throw new WebmergeApiError("Expected a JSON response from Webmerge", 502, {
        upstreamStatus: response.status,
        body: text
      });
    }

    try {
      return schema.parse(await response.json());
    } catch (error) {
      throw new WebmergeApiError("Webmerge returned an invalid JSON response", 502, {
        upstreamStatus: response.status,
        validation: error instanceof ZodError ? error.issues : String(error)
      });
    }
  }

  private async requestBinary(path: string, options: RequestOptions): Promise<BinaryResponse> {
    const response = await this.request(path, options);
    const body = Buffer.from(await response.arrayBuffer());

    return {
      contentType: response.headers.get("content-type") ?? "application/octet-stream",
      contentDisposition: response.headers.get("content-disposition") ?? undefined,
      body
    };
  }

  private async request(path: string, options: RequestOptions = {}): Promise<Response> {
    const url = new URL(`${this.baseUrl}${path}`);
    Object.entries(options.query ?? {}).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });

    const headers = new Headers();
    headers.set("Accept", "application/json, application/octet-stream;q=0.9, */*;q=0.8");
    if (options.authenticated !== false) {
      headers.set("Authorization", this.basicAuthHeader());
    }

    let body: BodyInit | undefined;
    if (options.body !== undefined) {
      headers.set("Content-Type", "application/json");
      body = JSON.stringify(options.body);
    }

    const response = await this.fetchImpl(url, {
      method: options.method ?? (options.body === undefined ? "GET" : "POST"),
      headers,
      body
    });

    if (!response.ok) {
      throw await this.toApiError(response);
    }

    return response;
  }

  private basicAuthHeader(): string {
    const { apiKey, apiSecret } = this.getCredentials();
    return `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`;
  }

  private async toApiError(response: Response): Promise<WebmergeApiError> {
    const contentType = response.headers.get("content-type") ?? "";
    let details: unknown;

    try {
      details = contentType.includes("application/json") ? await response.json() : await response.text();
    } catch {
      details = undefined;
    }

    return new WebmergeApiError(`Webmerge API request failed with status ${response.status}`, response.status, details);
  }
}

export function createWebmergeClient(options: WebmergeClientOptions = {}): WebmergeClient {
  return new WebmergeClient(options);
}
