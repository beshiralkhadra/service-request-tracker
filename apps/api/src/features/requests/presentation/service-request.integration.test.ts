import { hash } from "bcryptjs";
import request, { type Response } from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import {
  AgentSchema,
  AuthResponseSchema,
  PaginatedServiceRequestsSchema,
  ProblemDetailsSchema,
  ServiceRequestDetailSchema,
} from "@service-request-tracker/contracts";

import { UserRole } from "../../../generated/prisma/enums.js";
import { createIntegrationTestApp } from "../../../test/app.js";
import {
  createTestDatabase,
  type TestDatabase,
} from "../../../test/database.js";

const customerOne = {
  email: "customer-one@example.com",
  displayName: "Customer One",
  password: "customer-one-password",
};

const customerTwo = {
  email: "customer-two@example.com",
  displayName: "Customer Two",
  password: "customer-two-password",
};

const bearer = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
});

const accessTokenFrom = (response: Response): string =>
  AuthResponseSchema.parse(response.body).accessToken;

describe("service request API", () => {
  let database: TestDatabase;
  let app: ReturnType<typeof createIntegrationTestApp>;
  let customerOneToken: string;
  let customerTwoToken: string;
  let agentOneToken: string;
  let agentTwoToken: string;
  let agentOneId: string;
  let agentTwoId: string;

  beforeEach(async () => {
    database = await createTestDatabase();
    app = createIntegrationTestApp(database.prisma);

    customerOneToken = accessTokenFrom(
      await request(app).post("/api/v1/auth/register").send(customerOne),
    );
    customerTwoToken = accessTokenFrom(
      await request(app).post("/api/v1/auth/register").send(customerTwo),
    );

    const passwordHash = await hash("agent-password-123", 10);
    const [agentOne, agentTwo] = await Promise.all([
      database.prisma.user.create({
        data: {
          email: "agent-one@example.com",
          displayName: "Agent One",
          passwordHash,
          role: UserRole.AGENT,
        },
      }),
      database.prisma.user.create({
        data: {
          email: "agent-two@example.com",
          displayName: "Agent Two",
          passwordHash,
          role: UserRole.AGENT,
        },
      }),
    ]);
    agentOneId = agentOne.id;
    agentTwoId = agentTwo.id;

    agentOneToken = accessTokenFrom(
      await request(app).post("/api/v1/auth/login").send({
        email: agentOne.email,
        password: "agent-password-123",
      }),
    );
    agentTwoToken = accessTokenFrom(
      await request(app).post("/api/v1/auth/login").send({
        email: agentTwo.email,
        password: "agent-password-123",
      }),
    );
  });

  afterEach(async () => {
    await database.dispose();
  });

  const createRequest = async (
    token = customerOneToken,
    priority = "URGENT",
  ) => {
    const response = await request(app)
      .post("/api/v1/service-requests")
      .set(bearer(token))
      .send({
        title: "Water service interruption",
        description: "The building has no running water today.",
        priority,
      });
    expect(response.status).toBe(201);
    return ServiceRequestDetailSchema.parse(response.body);
  };

  it("requires authentication and validates malformed request data", async () => {
    const unauthenticated = await request(app).get("/api/v1/service-requests");
    expect(unauthenticated.status).toBe(401);
    expect(unauthenticated.body).toMatchObject({
      code: "AUTHENTICATION_REQUIRED",
    });

    const invalid = await request(app)
      .post("/api/v1/service-requests")
      .set(bearer(customerOneToken))
      .send({ title: "x", description: "short", priority: "CRITICAL" });
    expect(invalid.status).toBe(422);
    const problem = ProblemDetailsSchema.parse(invalid.body);
    expect(problem).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(problem.errors).toHaveProperty("title");
    expect(problem.errors).toHaveProperty("description");
    expect(problem.errors).toHaveProperty("priority");
  });

  it("creates a request with its SLA and initial audit event atomically", async () => {
    const created = await createRequest();

    expect(created).toMatchObject({
      status: "NEW",
      priority: "URGENT",
      version: 0,
      respondedAt: null,
      assignedAgent: null,
    });
    expect(created.statusHistory).toHaveLength(1);
    expect(created.statusHistory[0]).toMatchObject({
      fromStatus: null,
      toStatus: "NEW",
      actor: { role: "CUSTOMER" },
    });
    expect(
      new Date(created.slaDueAt).getTime() -
        new Date(created.createdAt).getTime(),
    ).toBe(2 * 60 * 60 * 1_000);

    expect(
      await database.prisma.requestStatusHistory.count({
        where: { requestId: created.id },
      }),
    ).toBe(1);
  });

  it("shows Customers only their own requests while Agents can filter all", async () => {
    const first = await createRequest(customerOneToken, "HIGH");
    await createRequest(customerTwoToken, "NORMAL");

    const customerListResponse = await request(app)
      .get("/api/v1/service-requests?status=NEW")
      .set(bearer(customerOneToken));
    expect(customerListResponse.status).toBe(200);
    const customerList = PaginatedServiceRequestsSchema.parse(
      customerListResponse.body,
    );
    expect(customerList.meta.totalItems).toBe(1);
    expect(customerList.data[0]?.id).toBe(first.id);

    const agentListResponse = await request(app)
      .get("/api/v1/service-requests?status=NEW")
      .set(bearer(agentOneToken));
    const agentList = PaginatedServiceRequestsSchema.parse(
      agentListResponse.body,
    );
    expect(agentList.meta.totalItems).toBe(2);

    const hiddenDetail = await request(app)
      .get(`/api/v1/service-requests/${first.id}`)
      .set(bearer(customerTwoToken));
    expect(hiddenDetail.status).toBe(404);
  });

  it("allows only Agents to list assignment targets and assign to Agents", async () => {
    const created = await createRequest();

    const customerAgents = await request(app)
      .get("/api/v1/agents")
      .set(bearer(customerOneToken));
    expect(customerAgents.status).toBe(403);

    const agents = await request(app)
      .get("/api/v1/agents")
      .set(bearer(agentOneToken));
    expect(agents.status).toBe(200);
    const agentList = z.array(AgentSchema).parse(agents.body);
    expect(agentList).toHaveLength(2);
    expect(agentList.map((agent) => agent.role)).toEqual(["AGENT", "AGENT"]);

    const customerId = AuthResponseSchema.parse(
      (
        await request(app).post("/api/v1/auth/login").send({
          email: customerTwo.email,
          password: customerTwo.password,
        })
      ).body,
    ).user.id;
    const invalidTarget = await request(app)
      .put(`/api/v1/service-requests/${created.id}/assignee`)
      .set(bearer(agentOneToken))
      .send({ assignedAgentId: customerId, version: 0 });
    expect(invalidTarget.status).toBe(409);
    expect(invalidTarget.body).toMatchObject({
      code: "ASSIGNEE_MUST_BE_AGENT",
    });

    const assignment = await request(app)
      .put(`/api/v1/service-requests/${created.id}/assignee`)
      .set(bearer(agentOneToken))
      .send({ assignedAgentId: agentOneId, version: 0 });
    expect(assignment.status).toBe(200);
    const assigned = ServiceRequestDetailSchema.parse(assignment.body);
    expect(assigned).toMatchObject({
      status: "ASSIGNED",
      version: 1,
      assignedAgent: { id: agentOneId, role: "AGENT" },
    });
    expect(assigned.respondedAt).not.toBeNull();
    expect(assigned.statusHistory).toHaveLength(2);

    const repeat = await request(app)
      .put(`/api/v1/service-requests/${created.id}/assignee`)
      .set(bearer(agentOneToken))
      .send({ assignedAgentId: agentTwoId, version: 1 });
    expect(repeat.status).toBe(409);
    expect(repeat.body).toMatchObject({ code: "REQUEST_ALREADY_ASSIGNED" });
  });

  it("allows only the assigned Agent to advance exact next statuses", async () => {
    const created = await createRequest();
    const assignment = await request(app)
      .put(`/api/v1/service-requests/${created.id}/assignee`)
      .set(bearer(agentOneToken))
      .send({ assignedAgentId: agentOneId, version: 0 });
    const assigned = ServiceRequestDetailSchema.parse(assignment.body);

    const otherAgent = await request(app)
      .post(`/api/v1/service-requests/${created.id}/transitions`)
      .set(bearer(agentTwoToken))
      .send({ toStatus: "IN_PROGRESS", version: assigned.version });
    expect(otherAgent.status).toBe(403);
    expect(otherAgent.body).toMatchObject({ code: "NOT_ASSIGNED_AGENT" });

    const skipped = await request(app)
      .post(`/api/v1/service-requests/${created.id}/transitions`)
      .set(bearer(agentOneToken))
      .send({ toStatus: "RESOLVED", version: assigned.version });
    expect(skipped.status).toBe(409);
    expect(skipped.body).toMatchObject({
      code: "INVALID_STATUS_TRANSITION",
    });

    const inProgress = await request(app)
      .post(`/api/v1/service-requests/${created.id}/transitions`)
      .set(bearer(agentOneToken))
      .send({ toStatus: "IN_PROGRESS", version: assigned.version });
    expect(inProgress.status).toBe(201);
    const transitioned = ServiceRequestDetailSchema.parse(inProgress.body);
    expect(transitioned).toMatchObject({ status: "IN_PROGRESS", version: 2 });
    expect(transitioned.statusHistory.map((event) => event.toStatus)).toEqual([
      "NEW",
      "ASSIGNED",
      "IN_PROGRESS",
    ]);

    const stale = await request(app)
      .post(`/api/v1/service-requests/${created.id}/transitions`)
      .set(bearer(agentOneToken))
      .send({ toStatus: "RESOLVED", version: assigned.version });
    expect(stale.status).toBe(409);
    expect(stale.body).toMatchObject({ code: "STALE_REQUEST_VERSION" });

    expect(
      await database.prisma.requestStatusHistory.count({
        where: { requestId: created.id },
      }),
    ).toBe(3);
  });
});
