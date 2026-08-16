import { compare, hash } from "bcryptjs";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AuthResponseSchema } from "@service-request-tracker/contracts";

import { UserRole } from "../../../generated/prisma/enums.js";
import {
  createTestDatabase,
  type TestDatabase,
} from "../../../test/database.js";
import { createIntegrationTestApp } from "../../../test/app.js";

const customerRegistration = {
  email: "customer@example.com",
  displayName: "Example Customer",
  password: "customer-password-123",
};

describe("authentication API", () => {
  let database: TestDatabase;

  beforeEach(async () => {
    database = await createTestDatabase();
  });

  afterEach(async () => {
    await database.dispose();
  });

  it("registers only a Customer, hashes the password, and rejects duplicates", async () => {
    const app = createIntegrationTestApp(database.prisma);
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({ ...customerRegistration, role: "AGENT" });

    expect(response.status).toBe(201);
    const session = AuthResponseSchema.parse(response.body);
    expect(session.user).toMatchObject({
      email: customerRegistration.email,
      role: "CUSTOMER",
    });
    expect(response.headers["set-cookie"]?.[0]).toContain(
      "service_tracker_refresh=",
    );
    expect(response.headers["set-cookie"]?.[0]).toContain("HttpOnly");
    expect(response.headers["set-cookie"]?.[0]).toContain("SameSite=Strict");

    const persisted = await database.prisma.user.findUniqueOrThrow({
      where: { email: customerRegistration.email },
    });
    expect(persisted.role).toBe(UserRole.CUSTOMER);
    expect(persisted.passwordHash).not.toBe(customerRegistration.password);
    expect(
      await compare(customerRegistration.password, persisted.passwordHash),
    ).toBe(true);
    expect(await database.prisma.refreshSession.count()).toBe(1);

    const duplicate = await request(app)
      .post("/api/v1/auth/register")
      .send(customerRegistration);
    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toMatchObject({
      code: "EMAIL_ALREADY_REGISTERED",
    });
  });

  it("logs in a seeded Agent without exposing password data", async () => {
    const password = "agent-password-123";
    await database.prisma.user.create({
      data: {
        email: "agent@example.com",
        displayName: "Support Agent",
        passwordHash: await hash(password, 10),
        role: UserRole.AGENT,
      },
    });

    const app = createIntegrationTestApp(database.prisma);
    const response = await request(app).post("/api/v1/auth/login").send({
      email: "AGENT@EXAMPLE.COM",
      password,
    });

    expect(response.status).toBe(200);
    const session = AuthResponseSchema.parse(response.body);
    expect(session.user.role).toBe("AGENT");
    expect(session.user).not.toHaveProperty("passwordHash");

    const failure = await request(app).post("/api/v1/auth/login").send({
      email: "missing@example.com",
      password: "wrong-password",
    });
    expect(failure.status).toBe(401);
    expect(failure.body).toMatchObject({ code: "INVALID_CREDENTIALS" });
  });

  it("rotates refresh cookies and rejects replay of the previous token", async () => {
    const app = createIntegrationTestApp(database.prisma);
    const registration = await request(app)
      .post("/api/v1/auth/register")
      .send(customerRegistration);
    const firstCookie = registration.headers["set-cookie"]?.[0];
    expect(firstCookie).toBeDefined();

    const refresh = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", firstCookie!);
    expect(refresh.status).toBe(200);
    const secondCookie = refresh.headers["set-cookie"]?.[0];
    expect(secondCookie).toBeDefined();
    expect(secondCookie).not.toBe(firstCookie);

    const replay = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", firstCookie!);
    expect(replay.status).toBe(401);
    expect(replay.body).toMatchObject({ code: "INVALID_REFRESH_TOKEN" });

    const sessions = await database.prisma.refreshSession.findMany({
      orderBy: { createdAt: "asc" },
    });
    expect(sessions).toHaveLength(2);
    expect(sessions[0]?.revokedAt).not.toBeNull();
    expect(sessions[1]?.revokedAt).toBeNull();
  });

  it("revokes the current refresh session on logout", async () => {
    const app = createIntegrationTestApp(database.prisma);
    const agent = request.agent(app);
    await agent.post("/api/v1/auth/register").send(customerRegistration);

    const logout = await agent.post("/api/v1/auth/logout");
    expect(logout.status).toBe(204);

    const refresh = await agent.post("/api/v1/auth/refresh");
    expect(refresh.status).toBe(401);
    expect(
      await database.prisma.refreshSession.count({
        where: { revokedAt: null },
      }),
    ).toBe(0);
  });
});
