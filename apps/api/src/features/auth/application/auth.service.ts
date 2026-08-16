import type {
  AuthResponse,
  LoginInput,
  RegisterInput,
  User,
} from "@service-request-tracker/contracts";

import { ApplicationError } from "../../../shared/errors/application-error.js";
import type {
  AuthRepository,
  PasswordHasher,
  TokenManager,
} from "../domain/auth.ports.js";
import type {
  AuthUser,
  IssuedAuthSession,
  RefreshSessionMetadata,
} from "../domain/auth.models.js";

const DUMMY_PASSWORD_HASH =
  "$2b$12$C6UzMDM.H6dfI/f/IKcEe.5pP2nPcYjYpMcpM3M8y8K2A7qgP9xY2";

export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenManager: TokenManager,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async register(
    input: RegisterInput,
    metadata: RefreshSessionMetadata,
  ): Promise<IssuedAuthSession> {
    if ((await this.repository.findUserByEmail(input.email)) !== null) {
      throw new ApplicationError(
        "EMAIL_ALREADY_REGISTERED",
        "An account already exists for this email address.",
      );
    }

    const passwordHash = await this.passwordHasher.hash(input.password);
    const user = await this.repository.createCustomer({
      email: input.email,
      displayName: input.displayName,
      passwordHash,
    });

    return this.issueSession(user, metadata);
  }

  async login(
    input: LoginInput,
    metadata: RefreshSessionMetadata,
  ): Promise<IssuedAuthSession> {
    const user = await this.repository.findUserByEmail(input.email);
    const passwordIsValid = await this.passwordHasher.verify(
      input.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (user === null || !passwordIsValid) {
      throw new ApplicationError(
        "INVALID_CREDENTIALS",
        "The email address or password is incorrect.",
      );
    }

    return this.issueSession(user, metadata);
  }

  async refresh(
    currentToken: string | undefined,
    metadata: RefreshSessionMetadata,
  ): Promise<IssuedAuthSession> {
    if (currentToken === undefined) {
      throw new ApplicationError(
        "INVALID_REFRESH_TOKEN",
        "A valid refresh session is required.",
      );
    }

    const now = this.clock();
    const replacement = this.tokenManager.createRefreshToken();
    const user = await this.repository.rotateRefreshSession({
      currentTokenHash: this.tokenManager.hashRefreshToken(currentToken),
      replacement: {
        tokenHash: replacement.tokenHash,
        expiresAt: this.tokenManager.getRefreshTokenExpiry(now),
        ...metadata,
      },
      now,
    });

    if (user === null) {
      throw new ApplicationError(
        "INVALID_REFRESH_TOKEN",
        "The refresh session is invalid, expired, or already used.",
      );
    }

    return this.createAuthResponse(user, replacement.token);
  }

  async logout(currentToken: string | undefined): Promise<void> {
    if (currentToken !== undefined) {
      await this.repository.revokeRefreshSession(
        this.tokenManager.hashRefreshToken(currentToken),
        this.clock(),
      );
    }
  }

  private async issueSession(
    user: AuthUser,
    metadata: RefreshSessionMetadata,
  ): Promise<IssuedAuthSession> {
    const now = this.clock();
    const refresh = this.tokenManager.createRefreshToken();

    await this.repository.createRefreshSession(user.id, {
      tokenHash: refresh.tokenHash,
      expiresAt: this.tokenManager.getRefreshTokenExpiry(now),
      ...metadata,
    });

    return this.createAuthResponse(user, refresh.token);
  }

  private async createAuthResponse(
    user: AuthUser,
    refreshToken: string,
  ): Promise<IssuedAuthSession> {
    const publicUser = this.toPublicUser(user);
    const accessToken = await this.tokenManager.createAccessToken(publicUser);

    const response: AuthResponse = {
      user: publicUser,
      accessToken,
      expiresInSeconds: this.tokenManager.accessTokenExpiresInSeconds,
    };

    return { response, refreshToken };
  }

  private toPublicUser(user: AuthUser): User {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    };
  }
}
