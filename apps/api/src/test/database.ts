import { readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import Database from "better-sqlite3";

import type { AppPrismaClient } from "../shared/database/prisma.js";
import { createPrismaClient } from "../shared/database/prisma.js";

const migrationPath = new URL(
  "../../prisma/migrations/20260816070852_init/migration.sql",
  import.meta.url,
);

export interface TestDatabase {
  prisma: AppPrismaClient;
  databaseUrl: string;
  dispose: () => Promise<void>;
}

export const createTestDatabase = async (): Promise<TestDatabase> => {
  const directory = await mkdtemp(join(tmpdir(), "service-tracker-test-"));
  const databasePath = join(directory, "test.db");
  const databaseUrl = `file:${databasePath}`;
  const sqlite = new Database(databasePath);

  try {
    sqlite.pragma("foreign_keys = ON");
    sqlite.exec(readFileSync(migrationPath, "utf8"));
  } finally {
    sqlite.close();
  }

  const prisma = createPrismaClient(databaseUrl);

  return {
    prisma,
    databaseUrl,
    dispose: async () => {
      await prisma.$disconnect();
      await rm(directory, { force: true, recursive: true });
    },
  };
};
