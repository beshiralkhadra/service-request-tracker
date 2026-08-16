import "dotenv/config";

import { createServer } from "node:http";

import { createApp } from "./app.js";
import { parseEnvironment } from "./shared/config/environment.js";
import { createPrismaClient } from "./shared/database/prisma.js";
import { createLogger } from "./shared/logger/logger.js";

const environment = parseEnvironment();
const logger = createLogger(environment.LOG_LEVEL);
const prisma = createPrismaClient(environment.DATABASE_URL);
const refreshTokenTtlMilliseconds =
  environment.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1_000;

const app = createApp({
  corsOrigin: environment.CORS_ORIGIN,
  logger,
  prisma,
  apiConfig: {
    passwordHashRounds: environment.PASSWORD_HASH_ROUNDS,
    token: {
      accessTokenSecret: environment.JWT_ACCESS_SECRET,
      refreshTokenPepper: environment.REFRESH_TOKEN_PEPPER,
      accessTokenTtlSeconds: environment.ACCESS_TOKEN_TTL_SECONDS,
      refreshTokenTtlDays: environment.REFRESH_TOKEN_TTL_DAYS,
      issuer: "service-request-tracker-api",
      audience: "service-request-tracker-web",
    },
    cookie: {
      name: "service_tracker_refresh",
      secure: environment.AUTH_COOKIE_SECURE,
      maxAgeMilliseconds: refreshTokenTtlMilliseconds,
    },
  },
  readinessCheck: async () => {
    await prisma.$queryRaw`SELECT 1`;
  },
});

const server = createServer(app);
server.listen(environment.API_PORT, () => {
  logger.info({ port: environment.API_PORT }, "API listening");
});

const closeServer = () =>
  new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error !== undefined) {
        reject(error);
        return;
      }

      resolve();
    });
  });

const shutdown = async (signal: NodeJS.Signals) => {
  logger.info({ signal }, "Shutting down API");

  try {
    await closeServer();
    await prisma.$disconnect();
  } catch (error) {
    logger.error({ error }, "API shutdown failed");
    process.exitCode = 1;
  }
};

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
