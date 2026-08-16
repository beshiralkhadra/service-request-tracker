import { Router } from "express";

import type { ProblemDetails } from "@service-request-tracker/contracts";

export interface HealthRouterDependencies {
  readinessCheck: () => Promise<void>;
}

export const createHealthRouter = ({
  readinessCheck,
}: HealthRouterDependencies) => {
  const router = Router();

  router.get("/live", (_request, response) => {
    response.status(200).json({ status: "ok" });
  });

  router.get("/ready", async (request, response) => {
    try {
      await readinessCheck();
      response.status(200).json({ status: "ready" });
    } catch {
      const problem: ProblemDetails = {
        type: "about:blank",
        title: "Service unavailable",
        status: 503,
        code: "INTERNAL_SERVER_ERROR",
        detail: "The database is not ready.",
        instance: request.originalUrl,
      };

      response.status(503).type("application/problem+json").json(problem);
    }
  });

  return router;
};
