import { join } from "node:path";

import { defineConfig, devices } from "@playwright/test";

const repositoryRoot = process.cwd();
const databasePath = join(repositoryRoot, ".e2e", "service-request-tracker.db");
const commonEnvironment = {
  DATABASE_URL: `file:${databasePath}`,
  JWT_ACCESS_SECRET: "e2e-access-secret-that-is-at-least-32-characters",
  REFRESH_TOKEN_PEPPER: "e2e-refresh-pepper-that-is-at-least-32-characters",
  ACCESS_TOKEN_TTL_SECONDS: "900",
  REFRESH_TOKEN_TTL_DAYS: "30",
  PASSWORD_HASH_ROUNDS: "10",
  AUTH_COOKIE_SECURE: "false",
  LOG_LEVEL: "silent",
};

export default defineConfig({
  expect: { timeout: 10_000 },
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: false,
  outputDir: "test-results",
  reporter: process.env.CI
    ? [["line"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  retries: process.env.CI ? 1 : 0,
  testDir: "e2e",
  timeout: 60_000,
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://localhost:3100",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  webServer: [
    {
      command:
        "pnpm --filter @service-request-tracker/api exec tsx src/server.ts",
      env: {
        ...commonEnvironment,
        API_PORT: "4100",
        CORS_ORIGIN: "http://localhost:3100",
      },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      url: "http://localhost:4100/health/ready",
    },
    {
      command:
        "pnpm --filter @service-request-tracker/web exec next dev --port 3100",
      env: {
        API_INTERNAL_URL: "http://localhost:4100",
        NEXT_TELEMETRY_DISABLED: "1",
      },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      url: "http://localhost:3100",
    },
  ],
  workers: 1,
});
