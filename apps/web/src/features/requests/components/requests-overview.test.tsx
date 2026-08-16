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
  ServiceRequest,
  ServiceRequestDetail,
} from "@service-request-tracker/contracts";

import {
  authSessionController,
  resetAuthStore,
} from "@/features/auth/state/auth.store";
import { apiClient } from "@/lib/http/api-client";
import { createQueryClient } from "@/providers/query-provider";

import { resetRequestFilters } from "../state/request-filters.store";
import { RequestsOverview } from "./requests-overview";

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

const listRequest: ServiceRequest = {
  id: "request-id-12345678",
  title: "Water service interruption",
  description: "The building has no running water today.",
  priority: "URGENT",
  status: "NEW",
  slaDueAt: "2026-08-17T12:00:00.000Z",
  respondedAt: null,
  version: 0,
  createdAt: "2026-08-16T10:00:00.000Z",
  updatedAt: "2026-08-16T10:00:00.000Z",
  customer: customerSession.user,
  assignedAgent: null,
};

const requestDetail: ServiceRequestDetail = {
  ...listRequest,
  statusHistory: [
    {
      id: "history-id",
      fromStatus: null,
      toStatus: "NEW",
      createdAt: listRequest.createdAt,
      actor: customerSession.user,
    },
  ],
};

const mock = new AxiosMockAdapter(apiClient);
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={createQueryClient()}>
    {children}
  </QueryClientProvider>
);

const mockQueue = () => {
  mock.onGet("/service-requests").reply(200, {
    data: [listRequest],
    meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
  });
};

afterEach(() => {
  cleanup();
  mock.reset();
  resetAuthStore();
  resetRequestFilters();
});

describe("RequestsOverview", () => {
  it("renders an authenticated Customer queue and creation command", async () => {
    authSessionController.setSession(customerSession);
    mockQueue();
    render(<RequestsOverview />, { wrapper });

    expect(
      screen.getByRole("heading", { level: 1, name: "Service requests" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "New request" }),
    ).toBeInTheDocument();
    expect(await screen.findAllByText(listRequest.title)).not.toHaveLength(0);
    expect(screen.getByText("1 total")).toBeInTheDocument();
  });

  it("opens authorized request details and status history", async () => {
    authSessionController.setSession(customerSession);
    mockQueue();
    mock.onGet(`/service-requests/${listRequest.id}`).reply(200, requestDetail);
    render(<RequestsOverview />, { wrapper });

    const titleButtons = await screen.findAllByText(listRequest.title);
    fireEvent.click(titleButtons[0]!);

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: listRequest.title }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("heading", { name: "Status history" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Request created")).toBeInTheDocument();
    expect(
      mock.history.get.some(
        (entry) => entry.url === `/service-requests/${listRequest.id}`,
      ),
    ).toBe(true);
  });
});
