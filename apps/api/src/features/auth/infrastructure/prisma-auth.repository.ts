import type { User as PrismaUser } from "../../../generated/prisma/client.js";
import { UserRole } from "../../../generated/prisma/enums.js";
import type { AppPrismaClient } from "../../../shared/database/prisma.js";
import { ApplicationError } from "../../../shared/errors/application-error.js";
import type { AuthRepository } from "../domain/auth.ports.js";
import type { AuthUser, NewRefreshSession } from "../domain/auth.models.js";

const isUniqueConstraintError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "P2002";

const toAuthUser = (user: PrismaUser): AuthUser => ({
  id: user.id,
  email: user.email,
  displayName: user.displayName,
  passwordHash: user.passwordHash,
  role: user.role,
});

const sessionData = (session: NewRefreshSession) => ({
  tokenHash: session.tokenHash,
  expiresAt: session.expiresAt,
  ...(session.userAgent === undefined ? {} : { userAgent: session.userAgent }),
  ...(session.ipAddress === undefined ? {} : { ipAddress: session.ipAddress }),
});

export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly prisma: AppPrismaClient) {}

  async findUserByEmail(email: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user === null ? null : toAuthUser(user);
  }

  async createCustomer(input: {
    email: string;
    displayName: string;
    passwordHash: string;
  }): Promise<AuthUser> {
    try {
      const user = await this.prisma.user.create({
        data: { ...input, role: UserRole.CUSTOMER },
      });
      return toAuthUser(user);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ApplicationError(
          "EMAIL_ALREADY_REGISTERED",
          "An account already exists for this email address.",
        );
      }
      throw error;
    }
  }

  async createRefreshSession(
    userId: string,
    session: NewRefreshSession,
  ): Promise<void> {
    await this.prisma.refreshSession.create({
      data: { userId, ...sessionData(session) },
    });
  }

  rotateRefreshSession(input: {
    currentTokenHash: string;
    replacement: NewRefreshSession;
    now: Date;
  }): Promise<AuthUser | null> {
    return this.prisma.$transaction(async (transaction) => {
      const current = await transaction.refreshSession.findUnique({
        where: { tokenHash: input.currentTokenHash },
        include: { user: true },
      });

      if (
        current === null ||
        current.revokedAt !== null ||
        current.expiresAt <= input.now
      ) {
        return null;
      }

      const revoked = await transaction.refreshSession.updateMany({
        where: {
          id: current.id,
          revokedAt: null,
          expiresAt: { gt: input.now },
        },
        data: { revokedAt: input.now, rotatedAt: input.now },
      });

      if (revoked.count !== 1) {
        return null;
      }

      await transaction.refreshSession.create({
        data: {
          userId: current.userId,
          ...sessionData(input.replacement),
        },
      });

      return toAuthUser(current.user);
    });
  }

  async revokeRefreshSession(tokenHash: string, now: Date): Promise<void> {
    await this.prisma.refreshSession.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: now },
    });
  }
}
