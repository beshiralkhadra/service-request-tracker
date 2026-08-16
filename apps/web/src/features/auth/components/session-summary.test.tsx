import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AuthResponse } from "@service-request-tracker/contracts";

import { createQueryClient } from "@/providers/query-provider";

import { AuthProvider } from "../context/auth-context";
import { authSessionController, resetAuthStore } from "../state/auth.store";
import { SessionSummary } from "./session-summary";

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

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={createQueryClient()}>
    <AuthProvider
      service={{
        clearSession: vi.fn(),
        refresh: vi.fn().mockResolvedValue(agentSession),
        setSession: authSessionController.setSession,
      }}
    >
      {children}
    </AuthProvider>
  </QueryClientProvider>
);

afterEach(() => {
  resetAuthStore();
});

describe("SessionSummary", () => {
  it("renders the restored user and role from Zustand", async () => {
    render(<SessionSummary />, { wrapper });

    expect(
      await screen.findByText(agentSession.user.displayName),
    ).toBeInTheDocument();
    expect(screen.getByText("Agent workspace")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sign out" }),
    ).toBeInTheDocument();
  });
});
