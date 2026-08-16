import axios from "axios";

import {
  ProblemDetailsSchema,
  type ApiErrorCode,
  type ProblemDetails,
} from "@service-request-tracker/contracts";

const fallbackProblem = (message: string): ProblemDetails => ({
  type: "about:blank",
  title: "Request failed",
  status: 0,
  code: "INTERNAL_SERVER_ERROR",
  detail: message,
});

export class ApiClientError extends Error {
  readonly code: ApiErrorCode;
  readonly errors?: Record<string, string[]>;
  readonly status: number;

  constructor(readonly problem: ProblemDetails) {
    super(problem.detail ?? problem.title);
    this.name = "ApiClientError";
    this.code = problem.code;
    this.status = problem.status;
    this.errors = problem.errors;
  }
}

export const toApiClientError = (error: unknown): ApiClientError => {
  if (error instanceof ApiClientError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const problem = ProblemDetailsSchema.safeParse(error.response?.data);
    if (problem.success) {
      return new ApiClientError(problem.data);
    }

    return new ApiClientError(
      fallbackProblem(
        error.response === undefined
          ? "The service could not be reached."
          : `The service returned HTTP ${error.response.status}.`,
      ),
    );
  }

  return new ApiClientError(
    fallbackProblem(
      error instanceof Error ? error.message : "An unexpected error occurred.",
    ),
  );
};
