"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  AssignServiceRequestInput,
  CreateServiceRequestInput,
  ServiceRequestDetail,
  ServiceRequestListQuery,
  TransitionServiceRequestInput,
} from "@service-request-tracker/contracts";

import { useAuthStore } from "@/features/auth/state/auth.store";

import { agentKeys, requestKeys } from "../api/request-keys";
import { requestsApi } from "../api/requests.api";
import { useRequestFilters } from "../state/request-filters.store";

const useIsAuthenticated = () =>
  useAuthStore((state) => state.status === "authenticated");

const useIsAgent = () =>
  useAuthStore(
    (state) => state.status === "authenticated" && state.user?.role === "AGENT",
  );

export const useServiceRequests = (query: ServiceRequestListQuery) => {
  const isAuthenticated = useIsAuthenticated();
  return useQuery({
    enabled: isAuthenticated,
    queryFn: () => requestsApi.getList(query),
    queryKey: requestKeys.list(query),
  });
};

export const useFilteredServiceRequests = () => {
  const { page, pageSize, status } = useRequestFilters();
  const query: ServiceRequestListQuery = {
    page,
    pageSize,
    ...(status === "ALL" ? {} : { status }),
  };
  return useServiceRequests(query);
};

export const useServiceRequest = (requestId: string | null) => {
  const isAuthenticated = useIsAuthenticated();
  return useQuery({
    enabled: isAuthenticated && requestId !== null,
    queryFn: () => requestsApi.getDetail(requestId!),
    queryKey: requestKeys.detail(requestId ?? "pending"),
  });
};

export const useAgents = () => {
  const isAgent = useIsAgent();
  return useQuery({
    enabled: isAgent,
    queryFn: requestsApi.getAgents,
    queryKey: agentKeys.all,
    staleTime: 5 * 60 * 1_000,
  });
};

const useRequestMutationInvalidation = () => {
  const queryClient = useQueryClient();

  return async (request: ServiceRequestDetail) => {
    queryClient.setQueryData(requestKeys.detail(request.id), request);
    await queryClient.invalidateQueries({ queryKey: requestKeys.lists() });
  };
};

export const useCreateServiceRequest = () => {
  const onSuccess = useRequestMutationInvalidation();
  return useMutation({
    mutationFn: (input: CreateServiceRequestInput) => requestsApi.create(input),
    onSuccess,
  });
};

export const useAssignServiceRequest = () => {
  const onSuccess = useRequestMutationInvalidation();
  return useMutation({
    mutationFn: ({
      requestId,
      input,
    }: {
      requestId: string;
      input: AssignServiceRequestInput;
    }) => requestsApi.assign(requestId, input),
    onSuccess,
  });
};

export const useTransitionServiceRequest = () => {
  const onSuccess = useRequestMutationInvalidation();
  return useMutation({
    mutationFn: ({
      requestId,
      input,
    }: {
      requestId: string;
      input: TransitionServiceRequestInput;
    }) => requestsApi.transition(requestId, input),
    onSuccess,
  });
};
