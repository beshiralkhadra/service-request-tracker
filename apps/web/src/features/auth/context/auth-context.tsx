"use client";

import { createContext, use, useEffect, useState, type ReactNode } from "react";

import type { AuthResponse } from "@service-request-tracker/contracts";

import { authApi } from "../api/auth.api";
import { authSessionController } from "../state/auth.store";

interface AuthBootstrapService {
  clearSession: () => void;
  refresh: () => Promise<AuthResponse>;
  setSession: (session: AuthResponse) => void;
}

interface AuthContextValue {
  hasBootstrapped: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const defaultBootstrapService: AuthBootstrapService = {
  clearSession: authSessionController.clearSession,
  refresh: authApi.refresh,
  setSession: authSessionController.setSession,
};

interface AuthProviderProps {
  children: ReactNode;
  service?: AuthBootstrapService;
}

export function AuthProvider({
  children,
  service = defaultBootstrapService,
}: AuthProviderProps) {
  const [hasBootstrapped, setHasBootstrapped] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    void service
      .refresh()
      .then((session) => {
        if (isCurrent) {
          service.setSession(session);
        }
      })
      .catch(() => {
        if (isCurrent) {
          service.clearSession();
        }
      })
      .finally(() => {
        if (isCurrent) {
          setHasBootstrapped(true);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [service]);

  return <AuthContext value={{ hasBootstrapped }}>{children}</AuthContext>;
}

export function useAuthContext(): AuthContextValue {
  const context = use(AuthContext);
  if (context === null) {
    throw new Error("useAuthContext must be used within AuthProvider.");
  }
  return context;
}
