import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      exclude: [
        "src/**/*.test.ts",
        "src/generated/**",
        "src/server.ts",
        "src/test/**",
      ],
      provider: "v8",
      reporter: ["text", "json-summary", "lcov"],
      reportsDirectory: "coverage",
      thresholds: {
        branches: 70,
        functions: 95,
        lines: 90,
        statements: 90,
      },
    },
  },
});
