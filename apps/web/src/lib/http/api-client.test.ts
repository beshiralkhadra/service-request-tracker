import AxiosMockAdapter from "axios-mock-adapter";
import type { AxiosRequestConfig } from "axios";
import { afterEach, describe, expect, it } from "vitest";

import type { AuthResponse } from "@service-request-tracker/contracts";

import {
  authSessionController,
  resetAuthStore,
  useAuthStore,
} from "@/features/auth/state/auth.store";

import { createApiClients } from "./api-client";
import { ApiClientError } from "./api-error";

const session = (accessToken: string): AuthResponse => ({
  accessToken,
  expiresInSeconds: 900,
  user: {
    id: "customer-id",
    displayName: "Example Customer",
    email: "customer@example.com",
    role: "CUSTOMER",
  },
});

afterEach(() => {
  resetAuthStore();
});

const authorizationHeader = (
  headers: AxiosRequestConfig["headers"],
): string | undefined => {
  const value = headers?.Authorization;
  return typeof value === "string" ? value : undefined;
};
describe("Axios API client", () => {
  it("adds the in-memory bearer token to API requests", async () => {
    authSessionController.setSession(session("access-token"));
    const { apiClient } = createApiClients();
    const mock = new AxiosMockAdapter(apiClient);
    mock
      .onGet("/service-requests")
      .reply((config) => [
        200,
        { authorization: authorizationHeader(config.headers) },
      ]);

    const response = await apiClient.get<{ authorization: string }>(
      "/service-requests",
    );

    expect(response.data.authorization).toBe("Bearer access-token");
  });

  it("uses one refresh request for concurrent protected 401 responses", async () => {
    authSessionController.setSession(session("expired-token"));
    const { apiClient, refreshClient } = createApiClients();
    const apiMock = new AxiosMockAdapter(apiClient);
    const refreshMock = new AxiosMockAdapter(refreshClient);
    let refreshCalls = 0;

    apiMock.onGet("/service-requests").reply((config) =>
      authorizationHeader(config.headers) === "Bearer fresh-token"
        ? [200, { ok: true }]
        : [
            401,
            {
              title: "Unauthorized",
              status: 401,
              code: "AUTHENTICATION_REQUIRED",
            },
          ],
    );
    refreshMock.onPost("/auth/refresh").reply(() => {
      refreshCalls += 1;
      return [200, session("fresh-token")];
    });

    const responses = await Promise.all([
      apiClient.get<{ ok: boolean }>("/service-requests"),
      apiClient.get<{ ok: boolean }>("/service-requests"),
    ]);

    expect(responses.map((response) => response.data.ok)).toEqual([true, true]);
    expect(refreshCalls).toBe(1);
    expect(authSessionController.getAccessToken()).toBe("fresh-token");
  });

  it("does not refresh authentication-route failures", async () => {
    const { apiClient, refreshClient } = createApiClients();
    const apiMock = new AxiosMockAdapter(apiClient);
    const refreshMock = new AxiosMockAdapter(refreshClient);
    apiMock.onPost("/auth/login").reply(401, {
      title: "Invalid credentials",
      status: 401,
      code: "INVALID_CREDENTIALS",
    });

    await expect(apiClient.post("/auth/login")).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
      status: 401,
    });
    expect(refreshMock.history.post).toHaveLength(0);
  });

  it("clears the session when refresh fails", async () => {
    authSessionController.setSession(session("expired-token"));
    const { apiClient, refreshClient } = createApiClients();
    const apiMock = new AxiosMockAdapter(apiClient);
    const refreshMock = new AxiosMockAdapter(refreshClient);
    apiMock.onGet("/service-requests").reply(401, {
      title: "Unauthorized",
      status: 401,
      code: "AUTHENTICATION_REQUIRED",
    });
    refreshMock.onPost("/auth/refresh").reply(401, {
      title: "Invalid refresh session",
      status: 401,
      code: "INVALID_REFRESH_TOKEN",
    });

    await expect(apiClient.get("/service-requests")).rejects.toBeInstanceOf(
      ApiClientError,
    );
    expect(useAuthStore.getState()).toMatchObject({
      accessToken: null,
      status: "unauthenticated",
      user: null,
    });
  });
});
