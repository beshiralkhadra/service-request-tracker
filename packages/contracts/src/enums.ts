import { z } from "zod";

export const USER_ROLES = ["CUSTOMER", "AGENT"] as const;
export const UserRoleSchema = z.enum(USER_ROLES);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const REQUEST_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
export const RequestPrioritySchema = z.enum(REQUEST_PRIORITIES);
export type RequestPriority = z.infer<typeof RequestPrioritySchema>;

export const REQUEST_STATUSES = [
  "NEW",
  "ASSIGNED",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
] as const;
export const RequestStatusSchema = z.enum(REQUEST_STATUSES);
export type RequestStatus = z.infer<typeof RequestStatusSchema>;

export const SLA_RESPONSE_TARGET_HOURS = {
  LOW: 120,
  NORMAL: 48,
  HIGH: 8,
  URGENT: 2,
} as const satisfies Record<RequestPriority, number>;
