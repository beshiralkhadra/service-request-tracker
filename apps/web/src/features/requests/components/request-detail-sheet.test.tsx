import { QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
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

import { RequestDetailSheet } from "./request-detail-sheet";

const agentSession: AuthResponse = {
  accessToken: "agent-access-token",
  expiresInSeconds: 900,
  user: {
    id: "agent-id",
    displayName: "Support Agent",
    email: "agent@example.com",
    role: "AGENT",
  },
};

const customer = {
  id: "customer-id",
  displayName: "Example Customer",
  email: "customer@example.com",
  role: "CUSTOMER" as const,
};

const newRequest: ServiceRequestDetail = {
  id: "request-id",
  title: "Water service interruption",
  description: "The building has no running water today.",
  priority: "URGENT",
  status: "NEW",
  slaDueAt: "2026-08-17T12:00:00.000Z",
  respondedAt: null,
  version: 0,
  createdAt: "2026-08-16T10:00:00.000Z",
  updatedAt: "2026-08-16T10:00:00.000Z",
  customer,
  assignedAgent: null,
  statusHistory: [
    {
      id: "history-created",
      fromStatus: null,
      toStatus: "NEW",
      createdAt: "2026-08-16T10:00:00.000Z",
      actor: customer,
    },
  ],
};

const assignedRequest: ServiceRequestDetail = {
  ...newRequest,
  status: "ASSIGNED",
  respondedAt: "2026-08-16T10:15:00.000Z",
  version: 1,
  assignedAgent: agentSession.user,
  statusHistory: [
    ...newRequest.statusHistory,
    {
      id: "history-assigned",
      fromStatus: "NEW",
      toStatus: "ASSIGNED",
      createdAt: "2026-08-16T10:15:00.000Z",
      actor: agentSession.user,
    },
  ],
};

const inProgressRequest: ServiceRequestDetail = {
  ...assignedRequest,
  status: "IN_PROGRESS",
  version: 2,
  statusHistory: [
    ...assignedRequest.statusHistory,
    {
      id: "history-progress",
      fromStatus: "ASSIGNED",
      toStatus: "IN_PROGRESS",
      createdAt: "2026-08-16T10:20:00.000Z",
      actor: agentSession.user,
    },
  ],
};

const mock = new AxiosMockAdapter(apiClient);
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={createQueryClient()}>
    {children}
  </QueryClientProvider>
);

afterEach(() => {
  cleanup();
  mock.reset();
  resetAuthStore();
});

describe("RequestDetailSheet Agent actions", () => {
  it("assigns a New request to an Agent with its current version", async () => {
    authSessionController.setSession(agentSession);
    mock.onGet(`/service-requests/${newRequest.id}`).reply(200, newRequest);
    mock.onGet("/agents").reply(200, [agentSession.user]);
    mock
      .onPut(`/service-requests/${newRequest.id}/assignee`)
      .reply(200, assignedRequest);
    render(
      <RequestDetailSheet
        onOpenChange={() => undefined}
        open
        requestId={newRequest.id}
      />,
      { wrapper },
    );

    await screen.findByRole("heading", { name: newRequest.title });
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(
      await screen.findByRole("option", { name: "Support Agent" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Assign request" }));

    await waitFor(() => expect(mock.history.put).toHaveLength(1));
    expect(mock.history.put[0]?.data).toBe(
      JSON.stringify({ assignedAgentId: agentSession.user.id, version: 0 }),
    );
    expect(await screen.findByText("Assigned")).toBeInTheDocument();
  });

  it("moves an assigned request only to its exact next status", async () => {
    authSessionController.setSession(agentSession);
    mock
      .onGet(`/service-requests/${assignedRequest.id}`)
      .reply(200, assignedRequest);
    mock.onGet("/agents").reply(200, [agentSession.user]);
    mock
      .onPost(`/service-requests/${assignedRequest.id}/transitions`)
      .reply(201, inProgressRequest);
    render(
      <RequestDetailSheet
        onOpenChange={() => undefined}
        open
        requestId={assignedRequest.id}
      />,
      { wrapper },
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Start progress" }),
    );

    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(mock.history.post[0]?.data).toBe(
      JSON.stringify({ toStatus: "IN_PROGRESS", version: 1 }),
    );
    expect(await screen.findByText("In progress")).toBeInTheDocument();
  });
});
