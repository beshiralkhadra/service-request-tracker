"use client";

import { CircleUserRound, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useAuthContext } from "../context/auth-context";
import { useAuth, useLogout } from "../hooks/use-auth";

export function SessionSummary() {
  const { hasBootstrapped } = useAuthContext();
  const { status, user } = useAuth();
  const logout = useLogout();

  const isLoading = !hasBootstrapped || status === "bootstrapping";
  const title = isLoading
    ? "Restoring session"
    : (user?.displayName ?? "Sign in required");
  const detail = isLoading
    ? "Checking account access"
    : user === null
      ? "No active session"
      : user.role === "AGENT"
        ? "Agent workspace"
        : "Customer workspace";

  return (
    <div className="flex items-center gap-3">
      <div className="grid size-8 shrink-0 place-items-center rounded-full border border-sidebar-border bg-sidebar-accent">
        <CircleUserRound aria-hidden="true" className="size-4" />
      </div>
      <div className="min-w-0 flex-1" aria-live="polite">
        <p className="truncate text-xs font-semibold">{title}</p>
        <p className="truncate text-[0.6875rem] text-sidebar-foreground/60">
          {detail}
        </p>
      </div>
      {user !== null ? (
        <Button
          aria-label="Sign out"
          className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          disabled={logout.isPending}
          onClick={() => logout.mutate()}
          size="icon-sm"
          title="Sign out"
          variant="ghost"
        >
          <LogOut aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  );
}
