import type { NextFunction, Request, Response } from "express";
import type { Logger } from "pino";
import { ZodError } from "zod";

import type {
  ApiErrorCode,
  ProblemDetails,
} from "@service-request-tracker/contracts";

import { ApplicationError } from "../errors/application-error.js";

const statusByErrorCode: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 422,
  AUTHENTICATION_REQUIRED: 401,
  INVALID_CREDENTIALS: 401,
  INVALID_REFRESH_TOKEN: 401,
  EMAIL_ALREADY_REGISTERED: 409,
  FORBIDDEN: 403,
  RESOURCE_NOT_FOUND: 404,
  CONFLICT: 409,
  ASSIGNEE_MUST_BE_AGENT: 409,
  REQUEST_ALREADY_ASSIGNED: 409,
  NOT_ASSIGNED_AGENT: 403,
  STALE_REQUEST_VERSION: 409,
  INVALID_STATUS_TRANSITION: 409,
  INTERNAL_SERVER_ERROR: 500,
};

export class HttpError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;

  constructor(status: number, code: ApiErrorCode, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
  }
}

const problemResponse = (
  request: Request,
  status: number,
  code: ApiErrorCode,
  title: string,
  detail?: string,
  errors?: Record<string, string[]>,
): ProblemDetails => ({
  type: "about:blank",
  title,
  status,
  code,
  instance: request.originalUrl,
  ...(detail === undefined ? {} : { detail }),
  ...(errors === undefined ? {} : { errors }),
});

const zodFieldErrors = (error: ZodError): Record<string, string[]> =>
  error.issues.reduce<Record<string, string[]>>((errors, issue) => {
    const field = issue.path.length === 0 ? "request" : issue.path.join(".");
    errors[field] = [...(errors[field] ?? []), issue.message];
    return errors;
  }, {});

const isMalformedJsonError = (error: unknown): boolean =>
  error instanceof SyntaxError && "status" in error && error.status === 400;

export const notFoundHandler = (request: Request, response: Response) => {
  response
    .status(404)
    .type("application/problem+json")
    .json(
      problemResponse(request, 404, "RESOURCE_NOT_FOUND", "Resource not found"),
    );
};

export const createErrorHandler =
  (logger: Logger) =>
  (
    error: unknown,
    request: Request,
    response: Response,
    _next: NextFunction,
  ) => {
    if (error instanceof ZodError) {
      response
        .status(422)
        .type("application/problem+json")
        .json(
          problemResponse(
            request,
            422,
            "VALIDATION_ERROR",
            "Request validation failed",
            "One or more request fields are invalid.",
            zodFieldErrors(error),
          ),
        );
      return;
    }

    if (isMalformedJsonError(error)) {
      response
        .status(400)
        .type("application/problem+json")
        .json(
          problemResponse(
            request,
            400,
            "VALIDATION_ERROR",
            "Malformed JSON request",
          ),
        );
      return;
    }

    if (error instanceof HttpError) {
      response
        .status(error.status)
        .type("application/problem+json")
        .json(
          problemResponse(request, error.status, error.code, error.message),
        );
      return;
    }

    if (error instanceof ApplicationError) {
      const status = statusByErrorCode[error.code];
      response
        .status(status)
        .type("application/problem+json")
        .json(problemResponse(request, status, error.code, error.message));
      return;
    }

    logger.error({ error }, "Unhandled request error");
    response
      .status(500)
      .type("application/problem+json")
      .json(
        problemResponse(
          request,
          500,
          "INTERNAL_SERVER_ERROR",
          "Internal server error",
        ),
      );
  };
