import type { ReactNode } from "react";
import { ClipboardList, LifeBuoy } from "lucide-react";
import Link from "next/link";

import { Separator } from "@/components/ui/separator";
import { SessionSummary } from "@/features/auth/components/session-summary";

import { MobileNavigation } from "./mobile-navigation";

interface WorkspaceShellProps {
  children: ReactNode;
}

export function WorkspaceShell({ children }: WorkspaceShellProps) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="hidden min-h-screen border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex lg:flex-col">
        <div className="flex h-16 items-center gap-3 px-5">
          <div className="grid size-8 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <LifeBuoy aria-hidden="true" className="size-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">Service Desk</p>
            <p className="font-mono text-[0.625rem] text-sidebar-foreground/60">
              REQUEST OPERATIONS
            </p>
          </div>
        </div>

        <Separator className="bg-sidebar-border" />

        <nav aria-label="Primary navigation" className="flex-1 px-3 py-5">
          <Link
            aria-current="page"
            className="flex h-9 items-center gap-3 rounded-md bg-sidebar-accent px-3 text-sm font-medium text-sidebar-accent-foreground"
            href="/"
          >
            <ClipboardList aria-hidden="true" className="size-4" />
            Requests
          </Link>
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <SessionSummary />
        </div>
      </aside>

      <div className="min-w-0">
        <header className="flex h-16 items-center justify-between border-b bg-card/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 lg:hidden">
            <MobileNavigation />
            <div className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">
              <LifeBuoy aria-hidden="true" className="size-4" />
            </div>
            <p className="text-sm font-semibold">Service Desk</p>
          </div>
          <p className="hidden text-xs text-muted-foreground lg:block">
            Customer support workspace
          </p>
          <div className="flex items-center gap-2">
            <span
              className="size-2 rounded-full bg-emerald-500"
              aria-hidden="true"
            />
            <span className="font-mono text-[0.6875rem] text-muted-foreground">
              SYSTEM READY
            </span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[90rem] p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
