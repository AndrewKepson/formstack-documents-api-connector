export type WebmergeId = string | number;

export type DocumentType = "html" | "pdf" | "docx" | "xlsx" | "pptx";
export type DocumentOutput = "pdf" | "docx" | "xlsx" | "pptx" | "email";
export type ToolOutput = "pdf" | "docx";

export interface WebmergeCredentials {
  apiKey: string;
  apiSecret: string;
}

export interface WebmergeClientOptions extends Partial<WebmergeCredentials> {
  baseUrl?: string;
  fetch?: typeof fetch;
}

export interface WebmergeField {
  key: string;
  name: string;
  [attribute: string]: unknown;
}

export type WebmergeDocumentFieldMap = Record<string, string>;

export interface WebmergeDocument {
  id: string;
  key: string;
  type: DocumentType | string;
  name: string;
  output: DocumentOutput | string;
  size?: string;
  size_width?: string;
  size_height?: string;
  active?: "0" | "1" | string;
  url: string;
  fields?: WebmergeField[] | WebmergeDocumentFieldMap;
  html?: string;
  [property: string]: unknown;
}

export interface WebmergeFolder {
  id: string;
  name: string;
  type: string;
  date?: string;
  [property: string]: unknown;
}

export interface DocumentListParams {
  search?: string;
  folder?: string;
}

export interface DocumentFieldsParams {
  attributes?: boolean | 0 | 1;
}

export type DocumentMergePayload = Record<string, unknown>;

export interface DocumentMergeOptions {
  /** Run the merge in Formstack's test mode. Defaults to true. */
  test?: boolean;
}

export interface CreateDocumentRequest {
  name: string;
  type: DocumentType;
  output: DocumentOutput;
  folder?: string;
  output_name?: string;
  file_contents?: string;
  file_url?: string;
  html?: string;
  settings?: Record<string, unknown>;
  [property: string]: unknown;
}

export interface UpdateDocumentRequest {
  name?: string;
  output?: DocumentOutput;
  folder?: string;
  output_name?: string;
  file_contents?: string;
  file_url?: string;
  html?: string;
  settings?: Record<string, unknown>;
  [property: string]: unknown;
}

export interface WebmergeDocumentFile {
  type: DocumentType | string;
  last_update: string;
  contents: string;
}

export interface WebmergeDelivery {
  id: string;
  type: string;
  settings: Record<string, unknown>;
  success?: 0 | 1 | string;
  [property: string]: unknown;
}

/**
 * Formstack's delivery list response omits settings for some delivery types.
 * Write responses retain the stricter WebmergeDelivery contract.
 */
export interface WebmergeDeliveryListItem {
  id: string;
  type: string;
  settings?: Record<string, unknown>;
  success?: 0 | 1 | string;
  [property: string]: unknown;
}

export interface DeliveryWriteRequest {
  type: "webhook";
  name?: string;
  active?: boolean | 0 | 1 | "0" | "1";
  settings: Record<string, unknown> & {
    url?: string;
    method?: "POST" | "post";
    headers?: Record<string, string>;
  };
  [property: string]: unknown;
}

export interface DeliveryCreateRequest extends DeliveryWriteRequest {
  settings: DeliveryWriteRequest["settings"] & {
    url: string;
  };
}

export interface WebmergeRoute {
  id: string;
  key: string;
  name: string;
  active?: "0" | "1" | string;
  url: string;
  rules?: WebmergeRouteRule[];
  [property: string]: unknown;
}

export interface WebmergeRouteRule {
  id?: string;
  document_id?: string;
  file?: string;
  sort?: number | string;
  combine?: 0 | 1 | string;
  combine_docx?: 0 | 1 | string;
  loop_field?: string;
  conditions?: WebmergeRouteCondition[];
  [property: string]: unknown;
}

export type RouteConditionExpression =
  | "=="
  | "!="
  | "<"
  | "<="
  | ">"
  | ">="
  | "contains"
  | "!contains";

export interface WebmergeRouteCondition {
  field: string;
  exp: RouteConditionExpression | string;
  value: string;
}

export interface WebmergeFileInput {
  name: string;
  url?: string;
  contents?: string;
}

export interface CombineFilesRequest {
  output: ToolOutput;
  files: WebmergeFileInput[];
}

export interface SingleFileToolRequest {
  file: WebmergeFileInput;
}

export interface EncryptPdfRequest extends SingleFileToolRequest {
  password: string;
  user_password?: string;
  permissions?: PdfPermission[];
}

export type PdfPermission =
  | "Printing"
  | "DegradedPrinting"
  | "ModifyContents"
  | "Assembly"
  | "CopyContents"
  | "FillIn"
  | "AllFeatures";

export interface SplitPdfRequest extends SingleFileToolRequest {
  extract?: string;
  remove?: string;
}

export interface BinaryResponse {
  contentType: string;
  contentDisposition?: string;
  body: Buffer;
}

export interface ApiErrorBody {
  status: number;
  message: string;
  details?: unknown;
}
