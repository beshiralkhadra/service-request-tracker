import {
  AuthResponseSchema,
  type AuthResponse,
  type LoginInput,
  type RegisterInput,
} from "@service-request-tracker/contracts";

import { apiClient } from "@/lib/http/api-client";

export const authApi = {
  login: async (input: LoginInput): Promise<AuthResponse> => {
    const response = await apiClient.post("/auth/login", input);
    return AuthResponseSchema.parse(response.data);
  },
  logout: async (): Promise<void> => {
    await apiClient.post("/auth/logout");
  },
  refresh: async (): Promise<AuthResponse> => {
    const response = await apiClient.post("/auth/refresh");
    return AuthResponseSchema.parse(response.data);
  },
  register: async (input: RegisterInput): Promise<AuthResponse> => {
    const response = await apiClient.post("/auth/register", input);
    return AuthResponseSchema.parse(response.data);
  },
};
