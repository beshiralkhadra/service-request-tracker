import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const dataDirectory = join(repositoryRoot, ".e2e");
const databasePath = join(dataDirectory, "service-request-tracker.db");
const environment = {
  ...process.env,
  DATABASE_URL: `file:${databasePath}`,
  SEED_AGENT_EMAIL: "agent@example.com",
  SEED_AGENT_NAME: "Support Agent",
  SEED_AGENT_PASSWORD: "e2e-agent-password-123",
};

mkdirSync(dataDirectory, { recursive: true });
rmSync(databasePath, { force: true });
rmSync(`${databasePath}-journal`, { force: true });
rmSync(`${databasePath}-shm`, { force: true });
rmSync(`${databasePath}-wal`, { force: true });

const runPnpm = (...arguments_) => {
  execFileSync("pnpm", arguments_, {
    cwd: repositoryRoot,
    env: environment,
    stdio: "inherit",
  });
};

runPnpm("build:contracts");
runPnpm("db:generate");
runPnpm("db:migrate:deploy");
runPnpm("db:seed");
