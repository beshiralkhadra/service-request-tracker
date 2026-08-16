import type {
  Agent,
  AssignServiceRequestInput,
  CreateServiceRequestInput,
  PaginatedServiceRequests,
  ServiceRequestDetail,
  ServiceRequestListQuery,
  TransitionServiceRequestInput,
} from "@service-request-tracker/contracts";
import { SLA_RESPONSE_TARGET_HOURS } from "@service-request-tracker/contracts";

import { ApplicationError } from "../../../shared/errors/application-error.js";
import type { AuthPrincipal } from "../../auth/domain/auth.models.js";
import { RequestLifecycle } from "../domain/request-lifecycle.js";
import type { RequestRepository } from "../domain/request.ports.js";

const requireCustomer = (principal: AuthPrincipal): void => {
  if (principal.role !== "CUSTOMER") {
    throw new ApplicationError(
      "FORBIDDEN",
      "Only Customers may create service requests.",
    );
  }
};

const requireAgent = (principal: AuthPrincipal): void => {
  if (principal.role !== "AGENT") {
    throw new ApplicationError(
      "FORBIDDEN",
      "Only Agents may perform this action.",
    );
  }
};

export class ServiceRequestService {
  constructor(
    private readonly repository: RequestRepository,
    private readonly lifecycle: RequestLifecycle,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  create(
    principal: AuthPrincipal,
    input: CreateServiceRequestInput,
  ): Promise<ServiceRequestDetail> {
    requireCustomer(principal);
    const now = this.clock();
    const targetHours = SLA_RESPONSE_TARGET_HOURS[input.priority];
    const slaDueAt = new Date(now.getTime() + targetHours * 60 * 60 * 1_000);

    return this.repository.create({
      customerId: principal.id,
      request: input,
      slaDueAt,
      now,
    });
  }

  list(
    principal: AuthPrincipal,
    query: ServiceRequestListQuery,
  ): Promise<PaginatedServiceRequests> {
    return this.repository.list(principal, query);
  }

  async getDetail(
    principal: AuthPrincipal,
    requestId: string,
  ): Promise<ServiceRequestDetail> {
    const request = await this.repository.findDetail(requestId, principal);
    if (request === null) {
      throw new ApplicationError(
        "RESOURCE_NOT_FOUND",
        "Service request not found.",
      );
    }
    return request;
  }

  async assign(
    principal: AuthPrincipal,
    requestId: string,
    input: AssignServiceRequestInput,
  ): Promise<ServiceRequestDetail> {
    requireAgent(principal);
    const current = await this.getMutableRequest(requestId);

    if (current.status !== "NEW") {
      throw new ApplicationError(
        "REQUEST_ALREADY_ASSIGNED",
        "Only a New request may be assigned.",
      );
    }
    if (current.version !== input.version) {
      throw new ApplicationError(
        "STALE_REQUEST_VERSION",
        "The request changed before this assignment was applied.",
      );
    }

    this.lifecycle.assertTransition(current.status, "ASSIGNED");
    return this.repository.assign({
      requestId,
      assignedAgentId: input.assignedAgentId,
      actorId: principal.id,
      expectedVersion: input.version,
      now: this.clock(),
    });
  }

  async transition(
    principal: AuthPrincipal,
    requestId: string,
    input: TransitionServiceRequestInput,
  ): Promise<ServiceRequestDetail> {
    requireAgent(principal);
    const current = await this.getMutableRequest(requestId);

    if (current.assignedAgentId !== principal.id) {
      throw new ApplicationError(
        "NOT_ASSIGNED_AGENT",
        "Only the assigned Agent may advance this request.",
      );
    }
    if (current.version !== input.version) {
      throw new ApplicationError(
        "STALE_REQUEST_VERSION",
        "The request changed before this transition was applied.",
      );
    }

    this.lifecycle.assertTransition(current.status, input.toStatus);
    return this.repository.transition({
      requestId,
      assignedAgentId: principal.id,
      actorId: principal.id,
      fromStatus: current.status,
      toStatus: input.toStatus,
      expectedVersion: input.version,
      now: this.clock(),
    });
  }

  listAgents(principal: AuthPrincipal): Promise<Agent[]> {
    requireAgent(principal);
    return this.repository.listAgents();
  }

  private async getMutableRequest(requestId: string) {
    const current = await this.repository.findForMutation(requestId);
    if (current === null) {
      throw new ApplicationError(
        "RESOURCE_NOT_FOUND",
        "Service request not found.",
      );
    }
    return current;
  }
}
