import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import type { RequestHandler } from "express";
import helmet from "helmet";
import type { Logger } from "pino";
import * as pinoHttpModule from "pino-http";

import { createApiRouter, type ApiRouterConfig } from "./api.router.js";
import { createHealthRouter } from "./features/health/presentation/health.router.js";
import type { AppPrismaClient } from "./shared/database/prisma.js";
import {
  createErrorHandler,
  notFoundHandler,
} from "./shared/http/problem-details.js";

const createRequestLogger = pinoHttpModule.pinoHttp as unknown as (options: {
  logger: Logger;
}) => RequestHandler;

export interface AppDependencies {
  corsOrigin: string;
  logger: Logger;
  prisma: AppPrismaClient;
  apiConfig: ApiRouterConfig;
  readinessCheck: () => Promise<void>;
}

export const createApp = ({
  corsOrigin,
  logger,
  prisma,
  apiConfig,
  readinessCheck,
}: AppDependencies) => {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ credentials: true, origin: corsOrigin }));
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(createRequestLogger({ logger }));

  app.use("/health", createHealthRouter({ readinessCheck }));
  app.use("/api/v1", createApiRouter({ prisma, config: apiConfig }));

  app.use(notFoundHandler);
  app.use(createErrorHandler(logger));

  return app;
};
