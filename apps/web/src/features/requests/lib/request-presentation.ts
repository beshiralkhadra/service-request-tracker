import type {
  RequestPriority,
  RequestStatus,
} from "@service-request-tracker/contracts";

export const PRIORITY_LABELS: Record<RequestPriority, string> = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  URGENT: "Urgent",
};

export const STATUS_LABELS: Record<RequestStatus, string> = {
  NEW: "New",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export const NEXT_STATUS: Record<RequestStatus, RequestStatus | null> = {
  NEW: "ASSIGNED",
  ASSIGNED: "IN_PROGRESS",
  IN_PROGRESS: "RESOLVED",
  RESOLVED: "CLOSED",
  CLOSED: null,
};

export const TRANSITION_LABELS: Partial<Record<RequestStatus, string>> = {
  IN_PROGRESS: "Start progress",
  RESOLVED: "Resolve request",
  CLOSED: "Close request",
};

export const formatDateTime = (value: string): string =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export const shortRequestId = (requestId: string): string =>
  requestId.slice(-8).toUpperCase();
