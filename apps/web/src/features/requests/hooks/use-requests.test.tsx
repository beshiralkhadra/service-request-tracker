import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import AxiosMockAdapter from "axios-mock-adapter";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";

import type {
  AuthResponse,
  ServiceRequestDetail,
} from "@service-request-tracker/contracts";

import {
  authSessionController,
  resetAuthStore,
} from "@/features/auth/state/auth.store";
import { apiClient } from "@/lib/http/api-client";
import { createQueryClient } from "@/providers/query-provider";

import { requestKeys } from "../api/request-keys";
import { useCreateServiceRequest, useServiceRequests } from "./use-requests";

const mock = new AxiosMockAdapter(apiClient);

const customerSession: AuthResponse = {
  accessToken: "customer-access-token",
  expiresInSeconds: 900,
  user: {
    id: "customer-id",
    displayName: "Example Customer",
    email: "customer@example.com",
    role: "CUSTOMER",
  },
};

const createdRequest: ServiceRequestDetail = {
  id: "request-id",
  title: "Water service interruption",
  description: "The building has no running water today.",
  priority: "URGENT",
  status: "NEW",
  slaDueAt: "2026-08-16T12:00:00.000Z",
  respondedAt: null,
  version: 0,
  createdAt: "2026-08-16T10:00:00.000Z",
  updatedAt: "2026-08-16T10:00:00.000Z",
  customer: customerSession.user,
  assignedAgent: null,
  statusHistory: [
    {
      id: "history-id",
      fromStatus: null,
      toStatus: "NEW",
      createdAt: "2026-08-16T10:00:00.000Z",
      actor: customerSession.user,
    },
  ],
};

const setup = () => {
  const queryClient = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
};

afterEach(() => {
  cleanup();
  mock.reset();
  resetAuthStore();
});

describe("request query hooks", () => {
  it("does not fetch request data until authentication has completed", () => {
    const { wrapper } = setup();
    mock.onGet("/service-requests").reply(200, {
      data: [],
      meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    });

    const { result } = renderHook(
      () => useServiceRequests({ page: 1, pageSize: 20 }),
      { wrapper },
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(mock.history.get).toHaveLength(0);
  });

  it("fetches a role-filtered request list after authentication", async () => {
    authSessionController.setSession(customerSession);
    const { wrapper } = setup();
    mock.onGet("/service-requests").reply(200, {
      data: [],
      meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    });

    const { result } = renderHook(
      () => useServiceRequests({ page: 1, pageSize: 20, status: "NEW" }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mock.history.get[0]?.params).toEqual({
      page: 1,
      pageSize: 20,
      status: "NEW",
    });
  });

  it("writes mutation responses to detail cache and invalidates lists", async () => {
    authSessionController.setSession(customerSession);
    const { queryClient, wrapper } = setup();
    const listKey = requestKeys.list({ page: 1, pageSize: 20 });
    queryClient.setQueryData(listKey, {
      data: [],
      meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    });
    mock.onPost("/service-requests").reply(201, createdRequest);

    const { result } = renderHook(useCreateServiceRequest, { wrapper });
    result.current.mutate({
      title: createdRequest.title,
      description: createdRequest.description,
      priority: createdRequest.priority,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(
      queryClient.getQueryData(requestKeys.detail(createdRequest.id)),
    ).toEqual(createdRequest);
    expect(queryClient.getQueryState(listKey)?.isInvalidated).toBe(true);
  });
});
