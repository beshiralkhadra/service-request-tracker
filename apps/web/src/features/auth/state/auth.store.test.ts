import { afterEach, describe, expect, it } from "vitest";

import type { AuthResponse } from "@service-request-tracker/contracts";

import {
  authSessionController,
  resetAuthStore,
  useAuthStore,
} from "./auth.store";

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
  resetAuthStore();
});

describe("auth store", () => {
  it("keeps the access token in memory and exposes it to the HTTP boundary", () => {
    authSessionController.setSession(customerSession);

    expect(useAuthStore.getState()).toMatchObject({
      accessToken: customerSession.accessToken,
      status: "authenticated",
      user: customerSession.user,
    });
    expect(authSessionController.getAccessToken()).toBe(
      customerSession.accessToken,
    );
  });

  it("clears all identity data when the session ends", () => {
    authSessionController.setSession(customerSession);
    authSessionController.clearSession();

    expect(useAuthStore.getState()).toMatchObject({
      accessToken: null,
      status: "unauthenticated",
      user: null,
    });
  });

  it("can return to bootstrapping without persisting credentials", () => {
    authSessionController.clearSession();
    authSessionController.beginBootstrap();

    expect(useAuthStore.getState().status).toBe("bootstrapping");
    expect(globalThis.localStorage.getItem("auth")).toBeNull();
  });
});
