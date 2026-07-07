import { z } from "zod";
import type { DeliveryWriteRequest } from "./types.js";

export const deliveryWriteSchema: z.ZodType<DeliveryWriteRequest> = z
  .object({
    type: z.literal("webhook"),
    name: z.string().min(1).optional(),
    active: z.union([z.boolean(), z.literal(0), z.literal(1), z.literal("0"), z.literal("1")]).optional(),
    settings: z
      .object({
        url: z.string().url().optional(),
        method: z.enum(["POST", "post"]).optional(),
        headers: z.record(z.string(), z.string()).optional()
      })
      .passthrough()
  })
  .passthrough();

export function parseDeliveryWriteRequest(payload: unknown): DeliveryWriteRequest {
  return deliveryWriteSchema.parse(payload);
}
