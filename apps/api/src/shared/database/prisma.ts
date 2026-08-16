import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

import { PrismaClient } from "../../generated/prisma/client.js";

const DEFAULT_DATABASE_URL = "file:./prisma/dev.db";

export const createPrismaClient = (
  databaseUrl = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
) => {
  const adapter = new PrismaBetterSqlite3(
    { url: databaseUrl, timeout: 5_000 },
    { timestampFormat: "iso8601" },
  );

  return new PrismaClient({ adapter });
};

export type AppPrismaClient = ReturnType<typeof createPrismaClient>;
