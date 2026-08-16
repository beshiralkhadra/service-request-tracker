import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import pino from "pino";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import { ProblemDetailsSchema } from "@service-request-tracker/contracts";

import { createApp } from "./app.js";
import { PrismaClient } from "./generated/prisma/client.js";

const clients: PrismaClient[] = [];
const apiConfig = {
  passwordHashRounds: 10,
  token: {
    accessTokenSecret: "test-access-secret-that-is-at-least-32-characters",
    refreshTokenPepper: "test-refresh-pepper-that-is-at-least-32-characters",
    accessTokenTtlSeconds: 900,
    refreshTokenTtlDays: 30,
    issuer: "service-request-tracker-api",
    audience: "service-request-tracker-web",
  },
  cookie: {
    name: "service_tracker_refresh",
    secure: false,
    maxAgeMilliseconds: 30 * 24 * 60 * 60 * 1_000,
  },
};

afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.$disconnect()));
});

const createTestApp = (readinessCheck: () => Promise<void>) => {
  const prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: ":memory:" }),
  });
  clients.push(prisma);

  return createApp({
    corsOrigin: "http://localhost:3000",
    logger: pino({ enabled: false }),
    prisma,
    apiConfig,
    readinessCheck,
  });
};

describe("health endpoints", () => {
  it("reports liveness without consulting the database", async () => {
    const response = await request(
      createTestApp(() =>
        Promise.reject(
          new Error("Liveness must not call readiness dependencies."),
        ),
      ),
    ).get("/health/live");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("reports readiness when SQLite accepts a query", async () => {
    const prisma = new PrismaClient({
      adapter: new PrismaBetterSqlite3({ url: ":memory:" }),
    });
    clients.push(prisma);

    const response = await request(
      createTestApp(async () => {
        await prisma.$queryRaw`SELECT 1`;
      }),
    ).get("/health/ready");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ready" });
  });

  it("returns problem details when the database is unavailable", async () => {
    const response = await request(
      createTestApp(() => Promise.reject(new Error("Database unavailable"))),
    ).get("/health/ready");

    expect(response.status).toBe(503);
    expect(response.headers["content-type"]).toContain(
      "application/problem+json",
    );
    expect(ProblemDetailsSchema.parse(response.body)).toMatchObject({
      status: 503,
      title: "Service unavailable",
      code: "INTERNAL_SERVER_ERROR",
    });
  });
});
