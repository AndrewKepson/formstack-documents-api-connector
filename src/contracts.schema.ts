import { z } from "zod";
import type {
  CombineFilesRequest,
  CreateDocumentRequest,
  EncryptPdfRequest,
  SingleFileToolRequest,
  SplitPdfRequest,
  UpdateDocumentRequest,
  WebmergeDelivery,
  WebmergeDocument,
  WebmergeDocumentFile,
  WebmergeField,
  WebmergeFileInput,
  WebmergeFolder,
  WebmergeRoute,
  WebmergeRouteCondition,
  WebmergeRouteRule
} from "./contracts.types.js";

export const idSchema = z.union([z.string().min(1), z.number().int().positive()]);

export const fileInputSchema: z.ZodType<WebmergeFileInput> = z
  .object({
    name: z.string().min(1).describe("File name, including extension."),
    url: z.string().url().optional().describe("Public URL for the file."),
    contents: z.string().min(1).optional().describe("Base64-encoded file contents.")
  })
  .refine((file) => Boolean(file.url || file.contents), {
    message: "Either url or contents is required"
  });

export const toolOutputSchema = z.enum(["pdf", "docx"]);

export const pdfPermissionSchema = z.enum([
  "Printing",
  "DegradedPrinting",
  "ModifyContents",
  "Assembly",
  "CopyContents",
  "FillIn",
  "AllFeatures"
]);

export const combineFilesSchema: z.ZodType<CombineFilesRequest> = z.object({
  output: toolOutputSchema,
  files: z.array(fileInputSchema).min(1)
});

export const singleFileToolSchema: z.ZodType<SingleFileToolRequest> = z.object({
  file: fileInputSchema
});

export const encryptPdfSchema: z.ZodType<EncryptPdfRequest> = z.object({
  file: fileInputSchema,
  password: z.string().min(1),
  user_password: z.string().min(1).optional(),
  permissions: z.array(pdfPermissionSchema).optional()
});

export const splitPdfSchema: z.ZodType<SplitPdfRequest> = z.object({
  file: fileInputSchema,
  extract: z.string().min(1).optional(),
  remove: z.string().min(1).optional()
});

const documentTypeSchema = z.enum(["html", "pdf", "docx", "xlsx", "pptx"]);
const documentOutputSchema = z.enum(["pdf", "docx", "xlsx", "pptx", "email"]);

export const documentCreateSchema: z.ZodType<CreateDocumentRequest> = z
  .object({
    name: z.string().min(1),
    type: documentTypeSchema,
    output: documentOutputSchema,
    folder: z.string().min(1).optional(),
    output_name: z.string().min(1).optional(),
    file_contents: z.string().min(1).optional(),
    file_url: z.string().url().optional(),
    html: z.string().min(1).optional(),
    settings: z.record(z.string(), z.unknown()).optional()
  })
  .passthrough();

export const documentUpdateSchema: z.ZodType<UpdateDocumentRequest> = z
  .object({
    name: z.string().min(1).optional(),
    output: documentOutputSchema.optional(),
    folder: z.string().min(1).optional(),
    output_name: z.string().min(1).optional(),
    file_contents: z.string().min(1).optional(),
    file_url: z.string().url().optional(),
    html: z.string().min(1).optional(),
    settings: z.record(z.string(), z.unknown()).optional()
  })
  .passthrough()
  .refine((payload) => Object.keys(payload).length > 0, { message: "Provide at least one document update field" });

export const documentListQuerySchema = z.object({
  search: z.string().min(1).optional(),
  folder: z.string().min(1).optional()
});

export const fieldsQuerySchema = z.object({
  attributes: z
    .union([z.literal("1"), z.literal("0"), z.literal("true"), z.literal("false")])
    .optional()
    .transform((value) => value === "1" || value === "true")
});

const responseIdSchema = z.union([z.string().min(1), z.number()]).transform(String);

export const webmergeFieldSchema: z.ZodType<WebmergeField> = z
  .object({
    key: z.string(),
    name: z.string()
  })
  .passthrough();

export const webmergeDocumentSchema: z.ZodType<WebmergeDocument> = z
  .object({
    id: responseIdSchema,
    key: z.string(),
    type: z.string(),
    name: z.string(),
    output: z.string(),
    size: z.string().optional(),
    size_width: z.string().optional(),
    size_height: z.string().optional(),
    active: z.string().optional(),
    url: z.string(),
    fields: z.array(webmergeFieldSchema).optional(),
    html: z.string().optional()
  })
  .passthrough();

export const webmergeFolderSchema: z.ZodType<WebmergeFolder> = z
  .object({
    id: responseIdSchema,
    name: z.string(),
    type: z.string(),
    date: z.string().optional()
  })
  .passthrough();

export const webmergeDocumentFileSchema: z.ZodType<WebmergeDocumentFile> = z.object({
  type: z.string(),
  last_update: z.string(),
  contents: z.string()
});

export const webmergeDeliverySchema: z.ZodType<WebmergeDelivery> = z
  .object({
    id: responseIdSchema,
    type: z.string(),
    settings: z.record(z.string(), z.unknown()),
    success: z.union([z.literal(0), z.literal(1), z.string()]).optional()
  })
  .passthrough();

export const webmergeRouteConditionSchema: z.ZodType<WebmergeRouteCondition> = z.object({
  field: z.string(),
  exp: z.string(),
  value: z.string()
});

export const webmergeRouteRuleSchema: z.ZodType<WebmergeRouteRule> = z
  .object({
    id: responseIdSchema.optional(),
    document_id: responseIdSchema.optional(),
    file: z.string().optional(),
    sort: z.union([z.number(), z.string()]).optional(),
    combine: z.union([z.literal(0), z.literal(1), z.string()]).optional(),
    combine_docx: z.union([z.literal(0), z.literal(1), z.string()]).optional(),
    loop_field: z.string().optional(),
    conditions: z.array(webmergeRouteConditionSchema).optional()
  })
  .passthrough();

export const webmergeRouteSchema: z.ZodType<WebmergeRoute> = z
  .object({
    id: responseIdSchema,
    key: z.string(),
    name: z.string(),
    active: z.string().optional(),
    url: z.string(),
    rules: z.array(webmergeRouteRuleSchema).optional()
  })
  .passthrough();

export const webmergeDocumentsSchema = z.array(webmergeDocumentSchema);
export const webmergeFoldersSchema = z.array(webmergeFolderSchema);
export const webmergeFieldsSchema = z.array(webmergeFieldSchema);
export const webmergeDeliveriesSchema = z.array(webmergeDeliverySchema);
export const webmergeRoutesSchema = z.array(webmergeRouteSchema);
export const webmergeRouteRulesSchema = z.array(webmergeRouteRuleSchema);
