import { z } from "zod";

import { RequestPrioritySchema, RequestStatusSchema } from "./enums.js";
import {
  createPaginatedResponseSchema,
  PaginationQuerySchema,
} from "./pagination.js";
import { UserSchema } from "./users.js";

const IdSchema = z.string().min(1);
const TimestampSchema = z.iso.datetime();

export const CreateServiceRequestInputSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(10).max(10_000),
  priority: RequestPrioritySchema,
});

export type CreateServiceRequestInput = z.infer<
  typeof CreateServiceRequestInputSchema
>;

export const ServiceRequestListQuerySchema = PaginationQuerySchema.extend({
  status: RequestStatusSchema.optional(),
});

export type ServiceRequestListQuery = z.infer<
  typeof ServiceRequestListQuerySchema
>;

export const ServiceRequestSchema = z.object({
  id: IdSchema,
  title: z.string(),
  description: z.string(),
  priority: RequestPrioritySchema,
  status: RequestStatusSchema,
  slaDueAt: TimestampSchema,
  respondedAt: TimestampSchema.nullable(),
  version: z.number().int().nonnegative(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  customer: UserSchema,
  assignedAgent: UserSchema.nullable(),
});

export type ServiceRequest = z.infer<typeof ServiceRequestSchema>;

export const RequestStatusHistorySchema = z.object({
  id: IdSchema,
  fromStatus: RequestStatusSchema.nullable(),
  toStatus: RequestStatusSchema,
  createdAt: TimestampSchema,
  actor: UserSchema,
});

export type RequestStatusHistory = z.infer<typeof RequestStatusHistorySchema>;

export const ServiceRequestDetailSchema = ServiceRequestSchema.extend({
  statusHistory: z.array(RequestStatusHistorySchema),
});

export type ServiceRequestDetail = z.infer<typeof ServiceRequestDetailSchema>;

export const PaginatedServiceRequestsSchema =
  createPaginatedResponseSchema(ServiceRequestSchema);

export type PaginatedServiceRequests = z.infer<
  typeof PaginatedServiceRequestsSchema
>;

export const AssignServiceRequestInputSchema = z.object({
  assignedAgentId: IdSchema,
  version: z.number().int().nonnegative(),
});

export type AssignServiceRequestInput = z.infer<
  typeof AssignServiceRequestInputSchema
>;

export const TransitionServiceRequestInputSchema = z.object({
  toStatus: RequestStatusSchema,
  version: z.number().int().nonnegative(),
});

export type TransitionServiceRequestInput = z.infer<
  typeof TransitionServiceRequestInputSchema
>;
