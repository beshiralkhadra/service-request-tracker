import pino from "pino";

import { createApp } from "../app.js";
import type { ApiRouterConfig } from "../api.router.js";
import type { AppPrismaClient } from "../shared/database/prisma.js";

export const TEST_API_CONFIG: ApiRouterConfig = {
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

export const createIntegrationTestApp = (prisma: AppPrismaClient) =>
  createApp({
    corsOrigin: "http://localhost:3000",
    logger: pino({ enabled: false }),
    prisma,
    apiConfig: TEST_API_CONFIG,
    readinessCheck: async () => {
      await prisma.$queryRaw`SELECT 1`;
    },
  });
