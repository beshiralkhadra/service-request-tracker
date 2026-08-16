import axios, {
  AxiosHeaders,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";

import {
  AuthResponseSchema,
  type AuthResponse,
} from "@service-request-tracker/contracts";

import { authSessionController } from "@/features/auth/state/auth.store";

import { toApiClientError } from "./api-error";

interface SessionController {
  clearSession: () => void;
  getAccessToken: () => string | null;
  setSession: (session: AuthResponse) => void;
}

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  hasRetriedAfterRefresh?: boolean;
}

const isAuthenticationRoute = (url: string | undefined): boolean =>
  url?.startsWith("/auth/") ?? false;

const setBearerToken = (
  config: InternalAxiosRequestConfig,
  accessToken: string,
) => {
  const headers = AxiosHeaders.from(config.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  config.headers = headers;
};

export const createApiClients = (
  sessionController: SessionController = authSessionController,
) => {
  const apiClient = axios.create({
    baseURL: "/api/v1",
    headers: { Accept: "application/json" },
    withCredentials: true,
  });
  const refreshClient = axios.create({
    baseURL: "/api/v1",
    headers: { Accept: "application/json" },
    withCredentials: true,
  });
  let refreshPromise: Promise<string> | null = null;

  const refreshAccessToken = (): Promise<string> => {
    refreshPromise ??= refreshClient
      .post("/auth/refresh")
      .then((response) => {
        const session = AuthResponseSchema.parse(response.data);
        sessionController.setSession(session);
        return session.accessToken;
      })
      .catch((error: unknown) => {
        sessionController.clearSession();
        throw toApiClientError(error);
      })
      .finally(() => {
        refreshPromise = null;
      });

    return refreshPromise;
  };

  apiClient.interceptors.request.use((config) => {
    const accessToken = sessionController.getAccessToken();
    if (accessToken !== null) {
      setBearerToken(config, accessToken);
    }
    return config;
  });

  apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const config = error.config as RetryableRequestConfig | undefined;
      const canRefresh =
        error.response?.status === 401 &&
        config !== undefined &&
        !config.hasRetriedAfterRefresh &&
        !isAuthenticationRoute(config.url);

      if (!canRefresh) {
        throw toApiClientError(error);
      }

      config.hasRetriedAfterRefresh = true;
      const accessToken = await refreshAccessToken();
      setBearerToken(config, accessToken);
      return apiClient.request(config);
    },
  );

  return { apiClient, refreshClient };
};

export const { apiClient } = createApiClients();
