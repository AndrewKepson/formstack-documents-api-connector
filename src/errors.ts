import type { ApiErrorBody } from "./types.js";

export class WebmergeApiError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "WebmergeApiError";
    this.status = status;
    this.details = details;
  }

  toJSON(): ApiErrorBody {
    return {
      status: this.status,
      message: this.message,
      details: this.details
    };
  }
}

export class CredentialsError extends Error {
  constructor(message = "Missing Formstack Documents API key or secret") {
    super(message);
    this.name = "CredentialsError";
  }
}
