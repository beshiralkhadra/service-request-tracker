import "dotenv/config";

import { z } from "zod";

import { UserRole } from "../src/generated/prisma/enums.js";
import { createPrismaClient } from "../src/shared/database/prisma.js";

const VerifyEnvironmentSchema = z.object({
  SEED_AGENT_EMAIL: z
    .string()
    .email()
    .transform((email) => email.toLowerCase()),
});

const { SEED_AGENT_EMAIL } = VerifyEnvironmentSchema.parse(process.env);
const prisma = createPrismaClient();

try {
  await prisma.$queryRaw`SELECT 1`;

  const foreignKeys = await prisma.$queryRaw<Array<{ foreign_keys: bigint }>>`
    PRAGMA foreign_keys
  `;
  if (Number(foreignKeys[0]?.foreign_keys) !== 1) {
    throw new Error("SQLite foreign-key enforcement is disabled.");
  }

  const migrationRows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) AS count FROM "_prisma_migrations"
  `;
  if (Number(migrationRows[0]?.count) < 1) {
    throw new Error("No Prisma migrations have been applied.");
  }

  const agent = await prisma.user.findUnique({
    where: { email: SEED_AGENT_EMAIL },
    select: { role: true },
  });
  if (agent?.role !== UserRole.AGENT) {
    throw new Error(
      "The configured seed Agent is missing or has the wrong role.",
    );
  }

  let roleConstraintRejected = false;
  try {
    await prisma.$executeRaw`
      INSERT INTO "User" (
        "id", "email", "displayName", "passwordHash", "role", "createdAt", "updatedAt"
      ) VALUES (
        'invalid-role-probe', 'invalid-role-probe@example.test', 'Probe', 'not-a-password',
        'ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `;
  } catch {
    roleConstraintRejected = true;
  }

  if (!roleConstraintRejected) {
    await prisma.$executeRaw`
      DELETE FROM "User" WHERE "id" = 'invalid-role-probe'
    `;
    throw new Error("The database accepted an invalid user role.");
  }

  console.log("Database verification passed.");
} finally {
  await prisma.$disconnect();
}
