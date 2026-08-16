"use client";

import { useEffect, useState } from "react";

import type { ServiceRequest } from "@service-request-tracker/contracts";

import { calculateSlaStatus, getSlaLabel } from "../lib/sla";

const useNow = (isRunning: boolean) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const interval = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(interval);
  }, [isRunning]);

  return now;
};

export const useSlaStatus = (
  request: Pick<ServiceRequest, "respondedAt" | "slaDueAt">,
) => {
  const now = useNow(request.respondedAt === null);
  const status = calculateSlaStatus(request, now);
  return { ...status, label: getSlaLabel(status) };
};
