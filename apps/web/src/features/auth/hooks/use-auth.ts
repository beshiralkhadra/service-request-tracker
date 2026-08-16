"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useShallow } from "zustand/react/shallow";

import type {
  AuthResponse,
  LoginInput,
  RegisterInput,
} from "@service-request-tracker/contracts";

import { authApi } from "../api/auth.api";
import { authSessionController, useAuthStore } from "../state/auth.store";

const establishSession = (session: AuthResponse) => {
  authSessionController.setSession(session);
  return session;
};

export const useAuth = () =>
  useAuthStore(
    useShallow((state) => ({
      status: state.status,
      user: state.user,
    })),
  );

export const useLogin = () =>
  useMutation({
    mutationFn: (input: LoginInput) => authApi.login(input),
    onSuccess: establishSession,
  });

export const useRegister = () =>
  useMutation({
    mutationFn: (input: RegisterInput) => authApi.register(input),
    onSuccess: establishSession,
  });

export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.logout,
    onSettled: async () => {
      authSessionController.clearSession();
      await queryClient.cancelQueries();
      queryClient.clear();
    },
  });
};
