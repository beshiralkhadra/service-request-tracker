"use client";

import { AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";

import type { ServiceRequest } from "@service-request-tracker/contracts";

import { cn } from "@/lib/utils";

import { useSlaStatus } from "../hooks/use-sla-status";

interface SlaIndicatorProps {
  className?: string;
  request: Pick<ServiceRequest, "respondedAt" | "slaDueAt">;
}

export function SlaIndicator({ className, request }: SlaIndicatorProps) {
  const status = useSlaStatus(request);
  const Icon =
    status.state === "BREACHED"
      ? AlertTriangle
      : status.state === "MET"
        ? CheckCircle2
        : Clock3;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-xs",
        status.state === "BREACHED"
          ? "font-semibold text-destructive"
          : status.state === "MET"
            ? "text-emerald-700"
            : "text-muted-foreground",
        className,
      )}
      title={`Response deadline: ${status.deadline.toLocaleString()}`}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {status.label}
    </span>
  );
}
