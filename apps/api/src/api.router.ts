import { Router } from "express";

import type { AppPrismaClient } from "./shared/database/prisma.js";
import { AuthService } from "./features/auth/application/auth.service.js";
import { BcryptPasswordHasher } from "./features/auth/infrastructure/bcrypt-password-hasher.js";
import {
  JoseTokenManager,
  type TokenManagerConfig,
} from "./features/auth/infrastructure/jose-token-manager.js";
import { PrismaAuthRepository } from "./features/auth/infrastructure/prisma-auth.repository.js";
import {
  createAuthenticationMiddleware,
  getAuthPrincipal,
  requireRole,
} from "./features/auth/presentation/auth.middleware.js";
import {
  createAuthRouter,
  type AuthCookieConfig,
} from "./features/auth/presentation/auth.router.js";
import { ServiceRequestService } from "./features/requests/application/service-request.service.js";
import { RequestLifecycle } from "./features/requests/domain/request-lifecycle.js";
import { PrismaRequestRepository } from "./features/requests/infrastructure/prisma-request.repository.js";
import { createServiceRequestRouter } from "./features/requests/presentation/service-request.router.js";

export interface ApiRouterConfig {
  token: TokenManagerConfig;
  cookie: AuthCookieConfig;
  passwordHashRounds: number;
}

export interface ApiRouterDependencies {
  prisma: AppPrismaClient;
  config: ApiRouterConfig;
  clock?: () => Date;
}

export const createApiRouter = ({
  prisma,
  config,
  clock,
}: ApiRouterDependencies) => {
  const router = Router();
  const tokenManager = new JoseTokenManager(config.token, clock);
  const authService = new AuthService(
    new PrismaAuthRepository(prisma),
    new BcryptPasswordHasher(config.passwordHashRounds),
    tokenManager,
    clock,
  );
  const requestService = new ServiceRequestService(
    new PrismaRequestRepository(prisma),
    new RequestLifecycle(),
    clock,
  );

  router.use("/auth", createAuthRouter(authService, config.cookie));
  router.use(createAuthenticationMiddleware(tokenManager));
  router.get("/agents", requireRole("AGENT"), async (request, response) => {
    response
      .status(200)
      .json(await requestService.listAgents(getAuthPrincipal(request)));
  });
  router.use("/service-requests", createServiceRequestRouter(requestService));

  return router;
};
