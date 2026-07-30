# Formstack Documents API Connector

Type-safe Node, Hono, MCP, and CLI connector for the Formstack Documents API, formerly Webmerge.

The Hono and MCP route surface is limited to non-destructive actions:

- Documents: list, get, fields, source file metadata/content, deliveries.
- Folders: list document folders.
- Data Routes: list, get, fields, rules, deliveries.
- Tools: combine files, convert to PDF, compress PDF, encrypt PDF, split PDF.

Document create/update, delivery create/update, copy, delete, and
merge-triggering endpoints are intentionally not exposed by the Hono app yet.
Selected write operations are available through the SDK and CLI so consuming
projects can wrap them in project-local allowlists and confirmation steps.

The MCP server follows the same boundary: it exposes no destructive account actions, and any non-read-only file-processing tool requires explicit user verification before the API call is made.

## Install

Node.js 20 or newer and pnpm 11 are required for development.

```bash
pnpm install
pnpm run build
```

## Configuration

Credentials can come from environment variables:

```bash
WEBMERGE_API_KEY=your-key
WEBMERGE_API_SECRET=your-secret
WEBMERGE_BASE_URL=https://www.webmerge.me
```

The Hono app also accepts credentials per request:

- `x-webmerge-api-key` and `x-webmerge-api-secret`
- `x-formstack-documents-api-key` and `x-formstack-documents-api-secret`
- Basic auth using `key:secret`

The bundled server binds to `127.0.0.1` by default. Environment credential
fallback is enabled for that local-only mode. Set
`ALLOW_ENV_CREDENTIAL_FALLBACK=false` to require credentials on every request.
The server refuses to start with environment credential fallback enabled when
`HOST` is not a loopback host. Remote deployments need a separate inbound
authentication boundary and should not expose the bundled server directly.

## Hono Server

```bash
pnpm run dev
```

Example:

```bash
curl http://localhost:3000/api/documents \
  -H "x-webmerge-api-key: $WEBMERGE_API_KEY" \
  -H "x-webmerge-api-secret: $WEBMERGE_API_SECRET"
```

Available endpoints:

```text
GET  /health
GET  /api/documents?search=&folder=
GET  /api/documents/folders
GET  /api/documents/:id
GET  /api/documents/:id/fields?attributes=1
GET  /api/documents/:id/file
GET  /api/documents/:id/deliveries
GET  /api/folders
GET  /api/routes
GET  /api/routes/:id
GET  /api/routes/:id/fields
GET  /api/routes/:id/rules
GET  /api/routes/:id/deliveries
POST /api/tools/combine
POST /api/tools/convert-to-pdf
POST /api/tools/compress-pdf
POST /api/tools/encrypt-pdf
POST /api/tools/split-pdf
```

`createApp()` returns an unbound Hono application. Use Web-standard requests to
embed or test it without opening a socket:

```ts
import { createApp } from "@redrockswebdevelopment/formstack-documents-api-connector";

const app = createApp();
const response = await app.request("/health");
const health = await response.json();
```

The bundled Node entry point passes `app.fetch` to `@hono/node-server`. Custom
hosts can do the same, while `CreateAppOptions.clientFactory` receives the
incoming Web `Request` when request-scoped client injection is needed.

## CLI

Run locally:

```bash
pnpm run cli -- documents list --search Contract
pnpm run cli -- documents folders
pnpm run cli -- documents get 436346
pnpm run cli -- routes rules 129578
```

Credentials can be supplied from any project:

```bash
formstack-documents \
  --key "$WEBMERGE_API_KEY" \
  --secret "$WEBMERGE_API_SECRET" \
  documents fields 436346 --attributes
```

Tool commands take JSON payloads and can write binary output:

```bash
formstack-documents tools convert-to-pdf \
  --payload '{"file":{"name":"contract.docx","url":"https://example.com/contract.docx"}}' \
  --out contract.pdf
```

Invalid JSON, schema-invalid payloads, and missing required options exit with a
nonzero status before an API request is made. Hono validation errors use a
`400` JSON response; missing request credentials use `401`; Formstack API
errors preserve the upstream status and details.

Document create and update are available only through the SDK and CLI so
projects can place their own allowlists, backups, and verification around
account document writes:

```bash
formstack-documents documents create \
  --payload-file sandbox-document-create.json

formstack-documents documents update 436346 \
  --payload-file sandbox-document-update.json

formstack-documents documents file 436346 \
  --out downloaded-template.pdf
```

Create/update payloads can include PDF bytes as base64 `file_contents`:

```json
{
  "name": "Codex API Sandbox PDF Lifecycle",
  "type": "pdf",
  "output": "pdf",
  "folder": "API Sandbox",
  "file_contents": "JVBERi0xLjcK..."
}
```

Document and data route delivery create/update are also available only through
the SDK and CLI. Prefer project-local allowlisted CLIs for production accounts:

```bash
formstack-documents documents deliveries 436346
formstack-documents documents deliveries list 436346
formstack-documents documents deliveries create 436346 \
  --payload-file document-webhook-delivery.json
formstack-documents documents deliveries update 436346 987654 \
  --payload-file document-webhook-delivery.json

formstack-documents routes deliveries 60877
formstack-documents routes deliveries list 60877
formstack-documents routes deliveries create 60877 \
  --payload-file route-webhook-delivery.json
formstack-documents routes deliveries update 60877 123456 \
  --payload-file route-webhook-delivery.json
```

Webhook delivery payloads should use `type: "webhook"` and include delivery
settings accepted by Formstack Documents. The CLI validates the basic webhook
shape before calling the API:

```json
{
  "type": "webhook",
  "name": "Local Documents Webhook",
  "active": true,
  "settings": {
    "url": "https://example.ngrok-free.app/webhooks/account-servicing/documents",
    "method": "POST"
  }
}
```

### Folder Paths

The Formstack Documents API has asymmetric folder behavior:

- `GET /api/folders` and `GET /api/folders/documents` return folder IDs, leaf
  names, type, and date. They do not return parent IDs or full nested paths.
- Document detail responses also expose only the leaf `folder` name.
- Document create/update accepts a slash-delimited `folder` string, such as
  `Account Servicing/Orion 403(b) Servicing`, and will place or move the
  document in that nested folder path.
- In account testing, `folder_id` did not move a document and should not be used
  as the placement contract unless Formstack documents that behavior later.

When duplicate folder names exist at different levels, client projects should
store the intended full folder path in their registry/config and send that exact
path in create/update payloads. Treat API reads as lossy for folder ancestry.

Do not expose these write commands directly through shared MCP tools. For
production templates, call them from project-local scripts that require an
explicit allowlisted document ID and backup the current uploaded file before
replacement.

## MCP Server

Build the project, then run the stdio MCP server:

```bash
pnpm run build
formstack-documents-mcp
```

Local development:

```bash
pnpm run mcp
```

## Validation and Publishing

Run the deterministic validation suite before publishing:

```bash
pnpm run validate
```

The suite type-checks the source, runs unit and integration tests, builds a
clean `dist` directory, exercises the built CLI and MCP executables, creates
and extracts an npm archive, imports its SDK, and runs both packaged binaries.
`npm publish` runs the same validation through `prepublishOnly`; `npm pack`
rebuilds through `prepack`.

The package exposes only the public root SDK entry point and `package.json`.
Import supported APIs from `@redrockswebdevelopment/formstack-documents-api-connector`
instead of deep-importing files from `dist`.

The Hono migration changes the public return type of `createApp` and changes
`CreateAppOptions.clientFactory` from an Express request to a Web `Request`.
Publish this migration as a semver-major release if existing consumers compile
against either framework-specific type.

Example MCP client config:

```json
{
  "mcpServers": {
    "formstack-documents": {
      "command": "formstack-documents-mcp",
      "env": {
        "WEBMERGE_API_KEY": "your-key",
        "WEBMERGE_API_SECRET": "your-secret"
      }
    }
  }
}
```

Read-only MCP tools:

```text
list_documents
list_document_folders
get_document
get_document_fields
get_document_file
get_document_deliveries
list_routes
get_route
get_route_fields
get_route_rules
get_route_deliveries
```

Non-read-only MCP tools require `confirmed: true` and `verificationNote`:

```text
combine_files
convert_to_pdf
compress_pdf
encrypt_pdf
split_pdf
```

Example verified tool payload:

```json
{
  "file": {
    "name": "contract.docx",
    "url": "https://example.com/contract.docx"
  },
  "confirmed": true,
  "verificationNote": "User approved converting this file to PDF."
}
```

## SDK

```ts
import { WebmergeClient } from "@redrockswebdevelopment/formstack-documents-api-connector";

const client = new WebmergeClient({
  apiKey: process.env.WEBMERGE_API_KEY,
  apiSecret: process.env.WEBMERGE_API_SECRET
});

const documents = await client.listDocuments({ search: "Contract" });
const fields = await client.getDocumentFields(documents[0].id, { attributes: true });
```

Create a sandbox PDF-backed document from base64 file contents:

```ts
const created = await client.createDocument({
  name: "Codex API Sandbox PDF Lifecycle",
  type: "pdf",
  output: "pdf",
  folder: "API Sandbox",
  file_contents: Buffer.from(pdfBytes).toString("base64")
});
```

Replace that same document's uploaded PDF file and verify the detected fields:

```ts
await client.updateDocument(created.id, {
  output: "pdf",
  file_contents: Buffer.from(updatedPdfBytes).toString("base64")
});

const file = await client.getDocumentFile(created.id);
const updatedFields = await client.getDocumentFields(created.id);
```

Create or update a webhook delivery from a guarded project script:

```ts
await client.createRouteDelivery(60877, {
  type: "webhook",
  name: "Account Servicing Local Documents Webhook",
  active: true,
  settings: {
    url: "https://example.ngrok-free.app/webhooks/account-servicing/documents",
    method: "POST"
  }
});
```

Document create/update APIs are low-level SDK primitives. Keep production
document replacement behind project-local allowlists, backup-before-write, and
post-write field verification.
