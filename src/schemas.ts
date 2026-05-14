import { z } from "zod";

export const idSchema = z.union([z.string().min(1), z.number().int().positive()]);

export const fileInputSchema = z
  .object({
    name: z.string().min(1),
    url: z.string().url().optional(),
    contents: z.string().min(1).optional()
  })
  .refine((file) => Boolean(file.url || file.contents), {
    message: "Either url or contents is required"
  });

export const combineFilesSchema = z.object({
  output: z.enum(["pdf", "docx"]),
  files: z.array(fileInputSchema).min(1)
});

export const singleFileToolSchema = z.object({
  file: fileInputSchema
});

export const encryptPdfSchema = singleFileToolSchema.extend({
  password: z.string().min(1),
  user_password: z.string().min(1).optional(),
  permissions: z
    .array(
      z.enum([
        "Printing",
        "DegradedPrinting",
        "ModifyContents",
        "Assembly",
        "CopyContents",
        "FillIn",
        "AllFeatures"
      ])
    )
    .optional()
});

export const splitPdfSchema = singleFileToolSchema.extend({
  extract: z.string().min(1).optional(),
  remove: z.string().min(1).optional()
});

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
