import type { Request, RequestHandler } from "express";

import type { UserRole } from "@service-request-tracker/contracts";

import { ApplicationError } from "../../../shared/errors/application-error.js";
import type { TokenManager } from "../domain/auth.ports.js";
import type { AuthPrincipal } from "../domain/auth.models.js";

const requestPrincipals = new WeakMap<Request, AuthPrincipal>();

export const createAuthenticationMiddleware =
  (tokenManager: TokenManager): RequestHandler =>
  async (request, _response, next) => {
    try {
      const authorization = request.get("authorization");
      if (!authorization?.startsWith("Bearer ")) {
        throw new ApplicationError(
          "AUTHENTICATION_REQUIRED",
          "A valid access token is required.",
        );
      }

      requestPrincipals.set(
        request,
        await tokenManager.verifyAccessToken(
          authorization.slice("Bearer ".length),
        ),
      );
      next();
    } catch (error) {
      next(error);
    }
  };

export const requireRole =
  (...roles: UserRole[]): RequestHandler =>
  (request, _response, next) => {
    const principal = requestPrincipals.get(request);
    if (principal === undefined) {
      next(
        new ApplicationError(
          "AUTHENTICATION_REQUIRED",
          "A valid access token is required.",
        ),
      );
      return;
    }

    if (!roles.includes(principal.role)) {
      next(
        new ApplicationError(
          "FORBIDDEN",
          "Your account is not allowed to perform this action.",
        ),
      );
      return;
    }

    next();
  };

export const getAuthPrincipal = (request: Request): AuthPrincipal => {
  const principal = requestPrincipals.get(request);
  if (principal === undefined) {
    throw new ApplicationError(
      "AUTHENTICATION_REQUIRED",
      "A valid access token is required.",
    );
  }
  return principal;
};
