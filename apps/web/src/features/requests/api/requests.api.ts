import {
  AgentSchema,
  PaginatedServiceRequestsSchema,
  ServiceRequestDetailSchema,
  type Agent,
  type AssignServiceRequestInput,
  type CreateServiceRequestInput,
  type PaginatedServiceRequests,
  type ServiceRequestDetail,
  type ServiceRequestListQuery,
  type TransitionServiceRequestInput,
} from "@service-request-tracker/contracts";

import { apiClient } from "@/lib/http/api-client";

export const requestsApi = {
  assign: async (
    requestId: string,
    input: AssignServiceRequestInput,
  ): Promise<ServiceRequestDetail> => {
    const response = await apiClient.put(
      `/service-requests/${requestId}/assignee`,
      input,
    );
    return ServiceRequestDetailSchema.parse(response.data);
  },
  create: async (
    input: CreateServiceRequestInput,
  ): Promise<ServiceRequestDetail> => {
    const response = await apiClient.post("/service-requests", input);
    return ServiceRequestDetailSchema.parse(response.data);
  },
  getAgents: async (): Promise<Agent[]> => {
    const response = await apiClient.get("/agents");
    return AgentSchema.array().parse(response.data);
  },
  getDetail: async (requestId: string): Promise<ServiceRequestDetail> => {
    const response = await apiClient.get(`/service-requests/${requestId}`);
    return ServiceRequestDetailSchema.parse(response.data);
  },
  getList: async (
    query: ServiceRequestListQuery,
  ): Promise<PaginatedServiceRequests> => {
    const response = await apiClient.get("/service-requests", {
      params: query,
    });
    return PaginatedServiceRequestsSchema.parse(response.data);
  },
  transition: async (
    requestId: string,
    input: TransitionServiceRequestInput,
  ): Promise<ServiceRequestDetail> => {
    const response = await apiClient.post(
      `/service-requests/${requestId}/transitions`,
      input,
    );
    return ServiceRequestDetailSchema.parse(response.data);
  },
};
