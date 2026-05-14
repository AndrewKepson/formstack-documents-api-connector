# Formstack Documents API Connector

Type-safe Node, Express, and CLI connector for the Formstack Documents API, formerly Webmerge.

The initial route surface is limited to non-destructive actions:

- Documents: list, get, fields, source file metadata/content, deliveries.
- Data Routes: list, get, fields, rules, deliveries.
- Tools: combine files, convert to PDF, compress PDF, encrypt PDF, split PDF.

Create, update, copy, delete, delivery creation, and merge-triggering endpoints are intentionally not exposed by the Express app yet.

## Install

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

The Express app also accepts credentials per request:

- `x-webmerge-api-key` and `x-webmerge-api-secret`
- `x-formstack-documents-api-key` and `x-formstack-documents-api-secret`
- Basic auth using `key:secret`

## Express Server

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
GET  /api/documents/:id
GET  /api/documents/:id/fields?attributes=1
GET  /api/documents/:id/file
GET  /api/documents/:id/deliveries
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

## CLI

Run locally:

```bash
pnpm run cli -- documents list --search Contract
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

## SDK

```ts
import { WebmergeClient } from "formstack-documents-api-connector";

const client = new WebmergeClient({
  apiKey: process.env.WEBMERGE_API_KEY,
  apiSecret: process.env.WEBMERGE_API_SECRET
});

const documents = await client.listDocuments({ search: "Contract" });
const fields = await client.getDocumentFields(documents[0].id, { attributes: true });
```
