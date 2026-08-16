import "dotenv/config";

import { hash } from "bcryptjs";
import { z } from "zod";

import { UserRole } from "../src/generated/prisma/enums.js";
import { createPrismaClient } from "../src/shared/database/prisma.js";

const SeedEnvironmentSchema = z.object({
  SEED_AGENT_EMAIL: z
    .string()
    .email()
    .transform((email) => email.toLowerCase()),
  SEED_AGENT_NAME: z.string().trim().min(2).max(100).default("Support Agent"),
  SEED_AGENT_PASSWORD: z.string().min(12).max(128),
});

const seedEnvironment = SeedEnvironmentSchema.parse(process.env);
const prisma = createPrismaClient();

try {
  const passwordHash = await hash(seedEnvironment.SEED_AGENT_PASSWORD, 12);

  const agent = await prisma.user.upsert({
    where: { email: seedEnvironment.SEED_AGENT_EMAIL },
    update: {
      displayName: seedEnvironment.SEED_AGENT_NAME,
      passwordHash,
      role: UserRole.AGENT,
    },
    create: {
      email: seedEnvironment.SEED_AGENT_EMAIL,
      displayName: seedEnvironment.SEED_AGENT_NAME,
      passwordHash,
      role: UserRole.AGENT,
    },
    select: { email: true, role: true },
  });

  console.log(`Seeded ${agent.role.toLowerCase()} account: ${agent.email}`);
} finally {
  await prisma.$disconnect();
}
