import type {
  RequestPriority,
  RequestStatus,
} from "@service-request-tracker/contracts";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { PRIORITY_LABELS, STATUS_LABELS } from "../lib/request-presentation";

export function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <Badge
      className={cn(
        status === "IN_PROGRESS" && "bg-sky-100 text-sky-800",
        status === "RESOLVED" && "bg-emerald-100 text-emerald-800",
        status === "CLOSED" && "bg-muted text-muted-foreground",
      )}
      variant={
        status === "NEW"
          ? "secondary"
          : status === "ASSIGNED"
            ? "outline"
            : "default"
      }
    >
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: RequestPriority }) {
  return (
    <Badge
      className={cn(
        priority === "HIGH" && "bg-amber-100 text-amber-900",
        priority === "LOW" && "text-muted-foreground",
      )}
      variant={
        priority === "URGENT"
          ? "destructive"
          : priority === "NORMAL"
            ? "outline"
            : "secondary"
      }
    >
      {PRIORITY_LABELS[priority]}
    </Badge>
  );
}
