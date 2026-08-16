import type { ServiceRequest } from "@service-request-tracker/contracts";

type SlaRequest = Pick<ServiceRequest, "respondedAt" | "slaDueAt">;

export type SlaState = "ACTIVE" | "BREACHED" | "MET";

export interface SlaStatus {
  deadline: Date;
  differenceMilliseconds: number;
  isRunning: boolean;
  state: SlaState;
}

export const calculateSlaStatus = (
  request: SlaRequest,
  now: Date = new Date(),
): SlaStatus => {
  const deadline = new Date(request.slaDueAt);
  const responseTime =
    request.respondedAt === null ? null : new Date(request.respondedAt);
  const comparisonTime = responseTime ?? now;
  const differenceMilliseconds = deadline.getTime() - comparisonTime.getTime();

  if (differenceMilliseconds < 0) {
    return {
      deadline,
      differenceMilliseconds,
      isRunning: responseTime === null,
      state: "BREACHED",
    };
  }

  return {
    deadline,
    differenceMilliseconds,
    isRunning: responseTime === null,
    state: responseTime === null ? "ACTIVE" : "MET",
  };
};

export const formatSlaDuration = (milliseconds: number): string => {
  const absoluteMinutes = Math.max(
    0,
    Math.ceil(Math.abs(milliseconds) / 60_000),
  );
  if (absoluteMinutes < 1) {
    return "<1m";
  }

  const days = Math.floor(absoluteMinutes / (24 * 60));
  const hours = Math.floor((absoluteMinutes % (24 * 60)) / 60);
  const minutes = absoluteMinutes % 60;
  const parts = [
    days > 0 ? `${days}d` : null,
    hours > 0 ? `${hours}h` : null,
    days === 0 && minutes > 0 ? `${minutes}m` : null,
  ].filter((part): part is string => part !== null);

  return parts.join(" ");
};

export const getSlaLabel = (status: SlaStatus): string => {
  const duration = formatSlaDuration(status.differenceMilliseconds);
  switch (status.state) {
    case "ACTIVE":
      return `${duration} remaining`;
    case "BREACHED":
      return `Breached by ${duration}`;
    case "MET":
      return `Responded with ${duration} remaining`;
  }
};
