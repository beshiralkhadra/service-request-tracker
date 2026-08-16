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
import { afterEach, describe, expect, it, vi } from "vitest";

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

import { CreateRequestDialog } from "./create-request-dialog";

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

describe("CreateRequestDialog", () => {
  it("submits a validated request and returns the created detail", async () => {
    authSessionController.setSession(customerSession);
    mock.onPost("/service-requests").reply(201, createdRequest);
    const onCreated = vi.fn();
    render(<CreateRequestDialog onCreated={onCreated} />, { wrapper });

    fireEvent.click(screen.getByRole("button", { name: "New request" }));
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: createdRequest.title },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: createdRequest.description },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit request" }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(createdRequest));
    expect(mock.history.post[0]?.data).toBe(
      JSON.stringify({
        title: createdRequest.title,
        description: createdRequest.description,
        priority: "NORMAL",
      }),
    );
  });
});
