"use client";

import { ClipboardList, Menu } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SessionSummary } from "@/features/auth/components/session-summary";

export function MobileNavigation() {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            aria-label="Open navigation"
            className="lg:hidden"
            size="icon"
            variant="outline"
          />
        }
      >
        <Menu aria-hidden="true" />
      </SheetTrigger>
      <SheetContent
        className="border-sidebar-border bg-sidebar text-sidebar-foreground"
        side="left"
      >
        <SheetHeader className="border-b border-sidebar-border pr-12">
          <SheetTitle className="text-sidebar-foreground">
            Service Desk
          </SheetTitle>
          <SheetDescription className="text-sidebar-foreground/60">
            Request operations
          </SheetDescription>
        </SheetHeader>
        <nav aria-label="Mobile navigation" className="flex-1 px-3 py-4">
          <Link
            aria-current="page"
            className="flex h-10 items-center gap-3 rounded-md bg-sidebar-accent px-3 text-sm font-medium text-sidebar-accent-foreground"
            href="/"
          >
            <ClipboardList aria-hidden="true" className="size-4" />
            Requests
          </Link>
        </nav>
        <div className="border-t border-sidebar-border p-4">
          <SessionSummary />
        </div>
      </SheetContent>
    </Sheet>
  );
}
