import { createHmac, randomBytes } from "node:crypto";

import { jwtVerify, SignJWT } from "jose";

import {
  UserRoleSchema,
  type UserRole,
} from "@service-request-tracker/contracts";

import { ApplicationError } from "../../../shared/errors/application-error.js";
import type { TokenManager } from "../domain/auth.ports.js";
import type { AuthPrincipal } from "../domain/auth.models.js";

export interface TokenManagerConfig {
  accessTokenSecret: string;
  refreshTokenPepper: string;
  accessTokenTtlSeconds: number;
  refreshTokenTtlDays: number;
  issuer: string;
  audience: string;
}

export class JoseTokenManager implements TokenManager {
  readonly accessTokenExpiresInSeconds: number;
  private readonly secret: Uint8Array;

  constructor(
    private readonly config: TokenManagerConfig,
    private readonly clock: () => Date = () => new Date(),
  ) {
    this.secret = new TextEncoder().encode(config.accessTokenSecret);
    this.accessTokenExpiresInSeconds = config.accessTokenTtlSeconds;
  }

  createAccessToken(user: {
    id: string;
    email: string;
    role: UserRole;
  }): Promise<string> {
    const issuedAt = Math.floor(this.clock().getTime() / 1_000);

    return new SignJWT({ email: user.email, role: user.role })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setSubject(user.id)
      .setIssuer(this.config.issuer)
      .setAudience(this.config.audience)
      .setIssuedAt(issuedAt)
      .setExpirationTime(issuedAt + this.config.accessTokenTtlSeconds)
      .sign(this.secret);
  }

  async verifyAccessToken(token: string): Promise<AuthPrincipal> {
    try {
      const { payload } = await jwtVerify(token, this.secret, {
        algorithms: ["HS256"],
        issuer: this.config.issuer,
        audience: this.config.audience,
        currentDate: this.clock(),
      });

      if (
        typeof payload.sub !== "string" ||
        typeof payload.email !== "string"
      ) {
        throw new Error("Required access-token claims are missing.");
      }

      return {
        id: payload.sub,
        email: payload.email,
        role: UserRoleSchema.parse(payload.role),
      };
    } catch {
      throw new ApplicationError(
        "AUTHENTICATION_REQUIRED",
        "A valid access token is required.",
      );
    }
  }

  createRefreshToken(): { token: string; tokenHash: string } {
    const token = randomBytes(32).toString("base64url");
    return { token, tokenHash: this.hashRefreshToken(token) };
  }

  hashRefreshToken(token: string): string {
    return createHmac("sha256", this.config.refreshTokenPepper)
      .update(token)
      .digest("hex");
  }

  getRefreshTokenExpiry(now: Date): Date {
    const expiresAt = new Date(now);
    expiresAt.setUTCDate(
      expiresAt.getUTCDate() + this.config.refreshTokenTtlDays,
    );
    return expiresAt;
  }
}
