import { z } from "zod";

export const API_ERROR_CODES = [
  "VALIDATION_ERROR",
  "AUTHENTICATION_REQUIRED",
  "INVALID_CREDENTIALS",
  "INVALID_REFRESH_TOKEN",
  "EMAIL_ALREADY_REGISTERED",
  "FORBIDDEN",
  "RESOURCE_NOT_FOUND",
  "CONFLICT",
  "ASSIGNEE_MUST_BE_AGENT",
  "REQUEST_ALREADY_ASSIGNED",
  "NOT_ASSIGNED_AGENT",
  "STALE_REQUEST_VERSION",
  "INVALID_STATUS_TRANSITION",
  "INTERNAL_SERVER_ERROR",
] as const;

export const ApiErrorCodeSchema = z.enum(API_ERROR_CODES);
export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;

export const ProblemDetailsSchema = z.object({
  type: z.string().min(1).default("about:blank"),
  title: z.string().min(1),
  status: z.number().int().min(400).max(599),
  detail: z.string().min(1).optional(),
  instance: z.string().min(1).optional(),
  code: ApiErrorCodeSchema,
  errors: z.record(z.string(), z.array(z.string().min(1))).optional(),
});

export type ProblemDetails = z.infer<typeof ProblemDetailsSchema>;
