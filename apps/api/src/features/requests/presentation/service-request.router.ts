import { Router } from "express";
import { z } from "zod";

import {
  AssignServiceRequestInputSchema,
  CreateServiceRequestInputSchema,
  ServiceRequestListQuerySchema,
  TransitionServiceRequestInputSchema,
} from "@service-request-tracker/contracts";

import {
  getAuthPrincipal,
  requireRole,
} from "../../auth/presentation/auth.middleware.js";
import type { ServiceRequestService } from "../application/service-request.service.js";

const RequestParamsSchema = z.object({ requestId: z.string().min(1) });

export const createServiceRequestRouter = (service: ServiceRequestService) => {
  const router = Router();

  router.get("/", async (request, response) => {
    const query = ServiceRequestListQuerySchema.parse(request.query);
    response
      .status(200)
      .json(await service.list(getAuthPrincipal(request), query));
  });

  router.post("/", requireRole("CUSTOMER"), async (request, response) => {
    const input = CreateServiceRequestInputSchema.parse(request.body);
    response
      .status(201)
      .json(await service.create(getAuthPrincipal(request), input));
  });

  router.put(
    "/:requestId/assignee",
    requireRole("AGENT"),
    async (request, response) => {
      const { requestId } = RequestParamsSchema.parse(request.params);
      const input = AssignServiceRequestInputSchema.parse(request.body);
      response
        .status(200)
        .json(
          await service.assign(getAuthPrincipal(request), requestId, input),
        );
    },
  );

  router.post(
    "/:requestId/transitions",
    requireRole("AGENT"),
    async (request, response) => {
      const { requestId } = RequestParamsSchema.parse(request.params);
      const input = TransitionServiceRequestInputSchema.parse(request.body);
      response
        .status(201)
        .json(
          await service.transition(getAuthPrincipal(request), requestId, input),
        );
    },
  );

  router.get("/:requestId", async (request, response) => {
    const { requestId } = RequestParamsSchema.parse(request.params);
    response
      .status(200)
      .json(await service.getDetail(getAuthPrincipal(request), requestId));
  });

  return router;
};
