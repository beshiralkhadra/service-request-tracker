import { create } from "zustand";

import type { AuthResponse, User } from "@service-request-tracker/contracts";

export type AuthStatus = "bootstrapping" | "authenticated" | "unauthenticated";

interface AuthState {
  accessToken: string | null;
  status: AuthStatus;
  user: User | null;
  beginBootstrap: () => void;
  clearSession: () => void;
  setSession: (session: AuthResponse) => void;
}

const initialSession = {
  accessToken: null,
  status: "bootstrapping" as const,
  user: null,
};

export const useAuthStore = create<AuthState>()((set) => ({
  ...initialSession,
  beginBootstrap: () => set({ status: "bootstrapping" }),
  clearSession: () =>
    set({ accessToken: null, status: "unauthenticated", user: null }),
  setSession: (session) =>
    set({
      accessToken: session.accessToken,
      status: "authenticated",
      user: session.user,
    }),
}));

export const authSessionController = {
  beginBootstrap: () => useAuthStore.getState().beginBootstrap(),
  clearSession: () => useAuthStore.getState().clearSession(),
  getAccessToken: () => useAuthStore.getState().accessToken,
  setSession: (session: AuthResponse) =>
    useAuthStore.getState().setSession(session),
};

export const resetAuthStore = () => {
  useAuthStore.setState(initialSession);
};
