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

import type { AuthResponse } from "@service-request-tracker/contracts";

import { apiClient } from "@/lib/http/api-client";
import { createQueryClient } from "@/providers/query-provider";

import { resetAuthStore, useAuthStore } from "../state/auth.store";
import { AuthForm } from "./auth-form";

const mock = new AxiosMockAdapter(apiClient);
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={createQueryClient()}>
    {children}
  </QueryClientProvider>
);

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

afterEach(() => {
  cleanup();
  mock.reset();
  resetAuthStore();
});

describe("AuthForm", () => {
  it("signs in through the real auth mutation and stores the session", async () => {
    mock.onPost("/auth/login").reply(200, customerSession);
    render(<AuthForm />, { wrapper });

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "customer@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "customer-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(useAuthStore.getState().status).toBe("authenticated"),
    );
    expect(useAuthStore.getState().user).toEqual(customerSession.user);
  });

  it("validates Customer registration before sending a request", async () => {
    render(<AuthForm />, { wrapper });
    fireEvent.click(screen.getByRole("tab", { name: "Register" }));
    fireEvent.change(screen.getByLabelText("Full name"), {
      target: { value: "A" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "invalid" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "short" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Create customer account" }),
    );

    expect(await screen.findAllByText(/at least/i)).not.toHaveLength(0);
    expect(mock.history.post).toHaveLength(0);
  });
});
