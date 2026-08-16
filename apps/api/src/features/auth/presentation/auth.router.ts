import { Router, type CookieOptions, type Request } from "express";

import {
  LoginInputSchema,
  RegisterInputSchema,
} from "@service-request-tracker/contracts";

import type { AuthService } from "../application/auth.service.js";
import type { RefreshSessionMetadata } from "../domain/auth.models.js";

export interface AuthCookieConfig {
  name: string;
  secure: boolean;
  maxAgeMilliseconds: number;
}

const cookieOptions = (config: AuthCookieConfig): CookieOptions => ({
  httpOnly: true,
  secure: config.secure,
  sameSite: "strict",
  path: "/api/v1/auth",
  maxAge: config.maxAgeMilliseconds,
});

const clearCookieOptions = (config: AuthCookieConfig): CookieOptions => ({
  httpOnly: true,
  secure: config.secure,
  sameSite: "strict",
  path: "/api/v1/auth",
});

const requestMetadata = (request: Request): RefreshSessionMetadata => {
  const userAgent = request.get("user-agent");
  return {
    ...(userAgent === undefined ? {} : { userAgent }),
    ...(request.ip === undefined ? {} : { ipAddress: request.ip }),
  };
};

const refreshCookie = (
  request: Request,
  cookieName: string,
): string | undefined => {
  const cookies = request.cookies as Record<string, unknown> | undefined;
  const value = cookies?.[cookieName];
  return typeof value === "string" ? value : undefined;
};

export const createAuthRouter = (
  service: AuthService,
  cookieConfig: AuthCookieConfig,
) => {
  const router = Router();

  router.post("/register", async (request, response) => {
    const input = RegisterInputSchema.parse(request.body);
    const session = await service.register(input, requestMetadata(request));
    response.cookie(
      cookieConfig.name,
      session.refreshToken,
      cookieOptions(cookieConfig),
    );
    response.status(201).json(session.response);
  });

  router.post("/login", async (request, response) => {
    const input = LoginInputSchema.parse(request.body);
    const session = await service.login(input, requestMetadata(request));
    response.cookie(
      cookieConfig.name,
      session.refreshToken,
      cookieOptions(cookieConfig),
    );
    response.status(200).json(session.response);
  });

  router.post("/refresh", async (request, response) => {
    const session = await service.refresh(
      refreshCookie(request, cookieConfig.name),
      requestMetadata(request),
    );
    response.cookie(
      cookieConfig.name,
      session.refreshToken,
      cookieOptions(cookieConfig),
    );
    response.status(200).json(session.response);
  });

  router.post("/logout", async (request, response) => {
    await service.logout(refreshCookie(request, cookieConfig.name));
    response.clearCookie(cookieConfig.name, clearCookieOptions(cookieConfig));
    response.status(204).send();
  });

  return router;
};
