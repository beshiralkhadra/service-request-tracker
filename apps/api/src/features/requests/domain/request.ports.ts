import type {
  Agent,
  CreateServiceRequestInput,
  PaginatedServiceRequests,
  RequestStatus,
  ServiceRequestDetail,
  ServiceRequestListQuery,
  UserRole,
} from "@service-request-tracker/contracts";

export interface RequestViewer {
  id: string;
  role: UserRole;
}

export interface MutableRequest {
  id: string;
  status: RequestStatus;
  version: number;
  assignedAgentId: string | null;
}

export interface RequestRepository {
  create(input: {
    customerId: string;
    request: CreateServiceRequestInput;
    slaDueAt: Date;
    now: Date;
  }): Promise<ServiceRequestDetail>;
  list(
    viewer: RequestViewer,
    query: ServiceRequestListQuery,
  ): Promise<PaginatedServiceRequests>;
  findDetail(
    requestId: string,
    viewer: RequestViewer,
  ): Promise<ServiceRequestDetail | null>;
  findForMutation(requestId: string): Promise<MutableRequest | null>;
  assign(input: {
    requestId: string;
    assignedAgentId: string;
    actorId: string;
    expectedVersion: number;
    now: Date;
  }): Promise<ServiceRequestDetail>;
  transition(input: {
    requestId: string;
    assignedAgentId: string;
    actorId: string;
    fromStatus: RequestStatus;
    toStatus: RequestStatus;
    expectedVersion: number;
    now: Date;
  }): Promise<ServiceRequestDetail>;
  listAgents(): Promise<Agent[]>;
}
