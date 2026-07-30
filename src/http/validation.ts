import type { Hook } from "@hono/zod-validator";
import type { Env } from "hono";

export const validationHook: Hook<unknown, Env, string> = (result, context) => {
  if (result.success) {
    return;
  }

  return context.json(
    {
      status: 400,
      message: "Invalid request",
      details: result.error.issues
    },
    400
  );
};
