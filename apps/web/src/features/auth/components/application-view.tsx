"use client";

import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { useAuthContext } from "../context/auth-context";
import { useAuth } from "../hooks/use-auth";
import { AuthForm } from "./auth-form";

interface ApplicationViewProps {
  children: ReactNode;
}

export function ApplicationView({ children }: ApplicationViewProps) {
  const { hasBootstrapped } = useAuthContext();
  const { status } = useAuth();

  if (!hasBootstrapped || status === "bootstrapping") {
    return (
      <main
        aria-label="Restoring session"
        className="grid min-h-screen place-items-center px-4"
      >
        <div className="w-full max-w-sm space-y-3">
          <Skeleton className="h-10 w-10 rounded-md" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </main>
    );
  }

  return status === "authenticated" ? children : <AuthForm />;
}
