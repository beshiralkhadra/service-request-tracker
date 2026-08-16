"use client";

import {
  AlertCircle,
  ArrowDownToLine,
  CircleDashed,
  Clock3,
  Inbox,
} from "lucide-react";
import { useState } from "react";

import {
  REQUEST_PRIORITIES,
  REQUEST_STATUSES,
  SLA_RESPONSE_TARGET_HOURS,
} from "@service-request-tracker/contracts";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/hooks/use-auth";

import { useFilteredServiceRequests } from "../hooks/use-requests";
import { calculateSlaStatus } from "../lib/sla";
import { PRIORITY_LABELS, STATUS_LABELS } from "../lib/request-presentation";
import {
  type RequestStatusFilter,
  useRequestFilters,
} from "../state/request-filters.store";
import { CreateRequestDialog } from "./create-request-dialog";
import { RequestDetailSheet } from "./request-detail-sheet";
import { RequestList } from "./request-list";

function QueueSkeleton() {
  return (
    <div aria-label="Loading requests" className="space-y-1 p-4">
      {Array.from({ length: 5 }, (_, index) => (
        <div
          className="grid h-16 grid-cols-[minmax(0,1fr)_6rem] items-center gap-4 border-b px-1 last:border-0"
          key={index}
        >
          <div className="space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-5 w-full" />
        </div>
      ))}
    </div>
  );
}

export function RequestsOverview() {
  const { user } = useAuth();
  const requestsQuery = useFilteredServiceRequests();
  const { page, pageSize, setPage, setPageSize, setStatus, status } =
    useRequestFilters();
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    null,
  );
  const requests = requestsQuery.data?.data ?? [];
  const totalItems = requestsQuery.data?.meta.totalItems ?? 0;
  const totalPages = requestsQuery.data?.meta.totalPages ?? 0;
  const visibleUnassigned = requests.filter(
    (request) => request.status === "NEW",
  ).length;
  const visibleInProgress = requests.filter(
    (request) => request.status === "IN_PROGRESS",
  ).length;
  const visibleBreached = requests.filter(
    (request) => calculateSlaStatus(request).state === "BREACHED",
  ).length;
  const workspaceLabel =
    user?.role === "AGENT" ? "Agent operations" : "Customer requests";
  const metrics = [
    { label: "Matching requests", value: totalItems, icon: CircleDashed },
    {
      label: "Unassigned on page",
      value: visibleUnassigned,
      icon: ArrowDownToLine,
    },
    { label: "In progress on page", value: visibleInProgress, icon: Clock3 },
    { label: "Breached on page", value: visibleBreached, icon: AlertCircle },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="secondary">{workspaceLabel}</Badge>
          <h1 className="mt-3 text-3xl font-semibold">Service requests</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {user?.role === "AGENT"
              ? "Triage incoming issues, own assigned work, and advance each request through resolution."
              : "Raise an issue and follow its status, ownership, response target, and history."}
          </p>
        </div>
        {user?.role === "CUSTOMER" ? (
          <CreateRequestDialog
            onCreated={(request) => setSelectedRequestId(request.id)}
          />
        ) : null}
      </div>

      <section aria-label="Request metrics" className="border-y bg-card">
        <div className="grid grid-cols-2 divide-x divide-y sm:grid-cols-4 sm:divide-y-0">
          {metrics.map(({ icon: Icon, label, value }) => (
            <div className="min-h-24 p-4" key={label}>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Icon aria-hidden="true" className="size-4" />
                <span className="text-xs">{label}</span>
              </div>
              <p className="mt-3 font-mono text-2xl font-semibold">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <section className="overflow-hidden rounded-lg border bg-card">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold">Request queue</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Status, priority, ownership, and response target
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select
                onValueChange={(value) =>
                  setStatus(value as RequestStatusFilter)
                }
                value={status}
              >
                <SelectTrigger
                  aria-label="Filter by status"
                  className="w-36"
                  size="sm"
                >
                  <SelectValue>
                    {status === "ALL" ? "All statuses" : STATUS_LABELS[status]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="ALL">All statuses</SelectItem>
                  {REQUEST_STATUSES.map((requestStatus) => (
                    <SelectItem key={requestStatus} value={requestStatus}>
                      {STATUS_LABELS[requestStatus]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="outline">{totalItems} total</Badge>
            </div>
          </div>

          {requestsQuery.isPending ? (
            <QueueSkeleton />
          ) : requestsQuery.isError ? (
            <div className="p-5">
              <Alert variant="destructive">
                <AlertCircle aria-hidden="true" />
                <AlertTitle>Request queue unavailable</AlertTitle>
                <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                  <span>
                    The queue could not be loaded. Check the connection and try
                    again.
                  </span>
                  <Button
                    onClick={() => void requestsQuery.refetch()}
                    size="sm"
                    variant="outline"
                  >
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            </div>
          ) : requests.length === 0 ? (
            <div className="grid min-h-72 place-items-center px-6 py-12 text-center">
              <div className="max-w-sm">
                <div className="mx-auto grid size-11 place-items-center rounded-lg border bg-muted/50 text-muted-foreground">
                  <Inbox aria-hidden="true" className="size-5" />
                </div>
                <h3 className="mt-4 text-sm font-semibold">
                  No matching requests
                </h3>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {status === "ALL"
                    ? user?.role === "CUSTOMER"
                      ? "Raise a request when you need help and it will appear here."
                      : "New customer requests will appear here as they arrive."
                    : `There are no requests currently marked ${STATUS_LABELS[status].toLowerCase()}.`}
                </p>
              </div>
            </div>
          ) : (
            <RequestList onSelect={setSelectedRequestId} requests={requests} />
          )}

          {requestsQuery.isSuccess && totalItems > 0 ? (
            <footer className="flex flex-col gap-3 border-t bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Rows</span>
                <Select
                  onValueChange={(value) => setPageSize(Number(value))}
                  value={String(pageSize)}
                >
                  <SelectTrigger aria-label="Rows per page" size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 50].map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <span className="font-mono text-xs text-muted-foreground">
                  Page {page} of {Math.max(totalPages, 1)}
                </span>
                <div className="flex gap-1">
                  <Button
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    size="sm"
                    variant="outline"
                  >
                    Previous
                  </Button>
                  <Button
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                    size="sm"
                    variant="outline"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </footer>
          ) : null}
        </section>

        <aside
          className="self-start rounded-lg border bg-card"
          aria-label="SLA targets"
        >
          <div className="border-b px-4 py-4">
            <h2 className="text-sm font-semibold">Response targets</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Measured from intake
            </p>
          </div>
          <div className="divide-y">
            {[...REQUEST_PRIORITIES].reverse().map((priority) => (
              <div
                className="flex items-center justify-between px-4 py-3"
                key={priority}
              >
                <span className="text-xs font-medium">
                  {PRIORITY_LABELS[priority]}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {SLA_RESPONSE_TARGET_HOURS[priority]}h
                </span>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <RequestDetailSheet
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRequestId(null);
          }
        }}
        open={selectedRequestId !== null}
        requestId={selectedRequestId}
      />
    </div>
  );
}
