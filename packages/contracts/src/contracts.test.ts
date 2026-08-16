import { describe, expect, it } from "vitest";

import {
  AssignServiceRequestInputSchema,
  CreateServiceRequestInputSchema,
  LoginInputSchema,
  PaginationQuerySchema,
  ProblemDetailsSchema,
  RegisterInputSchema,
  RequestPrioritySchema,
  RequestStatusSchema,
  ServiceRequestListQuerySchema,
  SLA_RESPONSE_TARGET_HOURS,
  TransitionServiceRequestInputSchema,
  UserRoleSchema,
} from "./index.js";

describe("shared contracts", () => {
  it("accepts only supported roles, priorities, and statuses", () => {
    expect(UserRoleSchema.parse("AGENT")).toBe("AGENT");
    expect(RequestPrioritySchema.parse("URGENT")).toBe("URGENT");
    expect(RequestStatusSchema.parse("IN_PROGRESS")).toBe("IN_PROGRESS");

    expect(UserRoleSchema.safeParse("ADMIN").success).toBe(false);
    expect(RequestPrioritySchema.safeParse("CRITICAL").success).toBe(false);
    expect(RequestStatusSchema.safeParse("REOPENED").success).toBe(false);
  });

  it("preserves the assessment SLA response targets", () => {
    expect(SLA_RESPONSE_TARGET_HOURS).toEqual({
      LOW: 120,
      NORMAL: 48,
      HIGH: 8,
      URGENT: 2,
    });
  });

  it("coerces pagination query strings and supplies defaults", () => {
    expect(PaginationQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 });
    expect(PaginationQuerySchema.parse({ page: "2", pageSize: "50" })).toEqual({
      page: 2,
      pageSize: 50,
    });
    expect(
      PaginationQuerySchema.safeParse({ page: 0, pageSize: 101 }).success,
    ).toBe(false);
  });

  it("validates the shared problem-details response", () => {
    expect(
      ProblemDetailsSchema.parse({
        title: "Invalid input",
        status: 422,
        code: "VALIDATION_ERROR",
        errors: { title: ["Title is required"] },
      }),
    ).toEqual({
      type: "about:blank",
      title: "Invalid input",
      status: 422,
      code: "VALIDATION_ERROR",
      errors: { title: ["Title is required"] },
    });
  });

  it("normalizes registration and never accepts a caller-selected role", () => {
    expect(
      RegisterInputSchema.parse({
        email: "Customer@Example.COM",
        displayName: "  Example Customer  ",
        password: "a-secure-password",
      }),
    ).toEqual({
      email: "customer@example.com",
      displayName: "Example Customer",
      password: "a-secure-password",
    });

    expect(
      RegisterInputSchema.safeParse({
        email: "customer@example.com",
        displayName: "Example Customer",
        password: "a-secure-password",
        role: "AGENT",
      }).success,
    ).toBe(true);
    expect(
      RegisterInputSchema.parse({
        email: "customer@example.com",
        displayName: "Example Customer",
        password: "a-secure-password",
        role: "AGENT",
      }),
    ).not.toHaveProperty("role");
  });

  it("validates login, request creation, filters, assignment, and transitions", () => {
    expect(
      LoginInputSchema.parse({
        email: "AGENT@EXAMPLE.COM",
        password: "password",
      }).email,
    ).toBe("agent@example.com");

    expect(
      CreateServiceRequestInputSchema.parse({
        title: "  Water service interruption  ",
        description: "  The building has no running water today.  ",
        priority: "URGENT",
      }),
    ).toEqual({
      title: "Water service interruption",
      description: "The building has no running water today.",
      priority: "URGENT",
    });

    expect(
      ServiceRequestListQuerySchema.parse({ status: "IN_PROGRESS" }),
    ).toEqual({ page: 1, pageSize: 20, status: "IN_PROGRESS" });
    expect(
      ServiceRequestListQuerySchema.safeParse({ status: "REOPENED" }).success,
    ).toBe(false);
    expect(
      AssignServiceRequestInputSchema.parse({
        assignedAgentId: "agent-id",
        version: 0,
      }),
    ).toEqual({ assignedAgentId: "agent-id", version: 0 });
    expect(
      TransitionServiceRequestInputSchema.safeParse({
        toStatus: "REOPENED",
        version: 1,
      }).success,
    ).toBe(false);
  });
});
