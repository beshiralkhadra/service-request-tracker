import type {
  AuthResponse,
  User,
  UserRole,
} from "@service-request-tracker/contracts";

export interface AuthUser extends User {
  passwordHash: string;
}

export interface AuthPrincipal {
  id: string;
  email: string;
  role: UserRole;
}

export interface RefreshSessionMetadata {
  userAgent?: string;
  ipAddress?: string;
}

export interface NewRefreshSession extends RefreshSessionMetadata {
  tokenHash: string;
  expiresAt: Date;
}

export interface IssuedAuthSession {
  response: AuthResponse;
  refreshToken: string;
}
