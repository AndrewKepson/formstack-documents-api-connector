import { z } from "zod";
import type { DeliveryCreateRequest, DeliveryWriteRequest } from "./contracts.types.js";

const activeSchema = z.union([z.boolean(), z.literal(0), z.literal(1), z.literal("0"), z.literal("1")]);

const deliverySettingsSchema = z
  .object({
    url: z.string().url().optional(),
    method: z.enum(["POST", "post"]).optional(),
    headers: z.record(z.string(), z.string()).optional()
  })
  .passthrough();

export const deliveryCreateSchema: z.ZodType<DeliveryCreateRequest> = z
  .object({
    type: z.literal("webhook"),
    name: z.string().min(1).optional(),
    active: activeSchema.optional(),
    settings: deliverySettingsSchema.extend({ url: z.string().url() })
  })
  .passthrough();

export const deliveryUpdateSchema: z.ZodType<DeliveryWriteRequest> = z
  .object({
    type: z.literal("webhook"),
    name: z.string().min(1).optional(),
    active: activeSchema.optional(),
    settings: deliverySettingsSchema
  })
  .passthrough();

export const deliveryWriteSchema = deliveryUpdateSchema;

export function parseDeliveryCreateRequest(payload: unknown): DeliveryCreateRequest {
  return deliveryCreateSchema.parse(payload);
}

export function parseDeliveryUpdateRequest(payload: unknown): DeliveryWriteRequest {
  return deliveryUpdateSchema.parse(payload);
}

export function parseDeliveryWriteRequest(payload: unknown): DeliveryWriteRequest {
  return parseDeliveryUpdateRequest(payload);
}
