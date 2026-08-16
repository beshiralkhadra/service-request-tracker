import type { ServiceRequestListQuery } from "@service-request-tracker/contracts";

export const requestKeys = {
  all: ["service-requests"] as const,
  detail: (requestId: string) => [...requestKeys.details(), requestId] as const,
  details: () => [...requestKeys.all, "detail"] as const,
  list: (query: ServiceRequestListQuery) =>
    [...requestKeys.lists(), query] as const,
  lists: () => [...requestKeys.all, "list"] as const,
};

export const agentKeys = {
  all: ["agents"] as const,
};
