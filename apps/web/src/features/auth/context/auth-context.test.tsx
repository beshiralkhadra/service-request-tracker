import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { AuthResponse } from "@service-request-tracker/contracts";

import { AuthProvider, useAuthContext } from "./auth-context";

const session: AuthResponse = {
  accessToken: "access-token",
  expiresInSeconds: 900,
  user: {
    id: "customer-id",
    displayName: "Example Customer",
    email: "customer@example.com",
    role: "CUSTOMER",
  },
};

function AuthStateProbe() {
  const { hasBootstrapped } = useAuthContext();
  return <span>{hasBootstrapped ? "ready" : "loading"}</span>;
}

describe("AuthProvider", () => {
  it("restores a valid refresh session exactly once", async () => {
    const service = {
      clearSession: vi.fn(),
      refresh: vi.fn().mockResolvedValue(session),
      setSession: vi.fn(),
    };

    render(
      <AuthProvider service={service}>
        <AuthStateProbe />
      </AuthProvider>,
    );

    expect(screen.getByText("loading")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("ready")).toBeInTheDocument());
    expect(service.refresh).toHaveBeenCalledTimes(1);
    expect(service.setSession).toHaveBeenCalledWith(session);
    expect(service.clearSession).not.toHaveBeenCalled();
  });

  it("settles as unauthenticated when no refresh session exists", async () => {
    const service = {
      clearSession: vi.fn(),
      refresh: vi.fn().mockRejectedValue(new Error("No refresh session")),
      setSession: vi.fn(),
    };

    render(
      <AuthProvider service={service}>
        <AuthStateProbe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText("ready")).toBeInTheDocument());
    expect(service.clearSession).toHaveBeenCalledTimes(1);
    expect(service.setSession).not.toHaveBeenCalled();
  });

  it("rejects use outside the provider boundary", () => {
    function InvalidConsumer() {
      useAuthContext();
      return null;
    }

    expect(() => render(<InvalidConsumer />)).toThrow(
      "useAuthContext must be used within AuthProvider.",
    );
  });
});
