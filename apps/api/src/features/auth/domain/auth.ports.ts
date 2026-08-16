import type { UserRole } from "@service-request-tracker/contracts";

import type {
  AuthPrincipal,
  AuthUser,
  NewRefreshSession,
} from "./auth.models.js";

export interface AuthRepository {
  findUserByEmail(email: string): Promise<AuthUser | null>;
  createCustomer(input: {
    email: string;
    displayName: string;
    passwordHash: string;
  }): Promise<AuthUser>;
  createRefreshSession(
    userId: string,
    session: NewRefreshSession,
  ): Promise<void>;
  rotateRefreshSession(input: {
    currentTokenHash: string;
    replacement: NewRefreshSession;
    now: Date;
  }): Promise<AuthUser | null>;
  revokeRefreshSession(tokenHash: string, now: Date): Promise<void>;
}

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, passwordHash: string): Promise<boolean>;
}

export interface TokenManager {
  readonly accessTokenExpiresInSeconds: number;
  createAccessToken(user: {
    id: string;
    email: string;
    role: UserRole;
  }): Promise<string>;
  verifyAccessToken(token: string): Promise<AuthPrincipal>;
  createRefreshToken(): { token: string; tokenHash: string };
  hashRefreshToken(token: string): string;
  getRefreshTokenExpiry(now: Date): Date;
}
