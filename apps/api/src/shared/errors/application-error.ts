import type { ApiErrorCode } from "@service-request-tracker/contracts";

export class ApplicationError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ApplicationError";
  }
}
