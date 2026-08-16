"use client";

import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  LoaderCircle,
  UserRound,
} from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { ApiClientError } from "@/lib/http/api-error";

import {
  useAgents,
  useAssignServiceRequest,
  useServiceRequest,
  useTransitionServiceRequest,
} from "../hooks/use-requests";
import {
  formatDateTime,
  NEXT_STATUS,
  shortRequestId,
  STATUS_LABELS,
  TRANSITION_LABELS,
} from "../lib/request-presentation";
import { PriorityBadge, StatusBadge } from "./request-badges";
import { SlaIndicator } from "./sla-indicator";

interface RequestDetailSheetProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  requestId: string | null;
}

const mutationMessage = (error: Error | null): string | null => {
  if (error === null) {
    return null;
  }
  return error instanceof ApiClientError
    ? error.message
    : "The request changed before the action completed. Refresh and try again.";
};

export function RequestDetailSheet({
  onOpenChange,
  open,
  requestId,
}: RequestDetailSheetProps) {
  const { user } = useAuth();
  const detail = useServiceRequest(open ? requestId : null);
  const agents = useAgents();
  const assignRequest = useAssignServiceRequest();
  const transitionRequest = useTransitionServiceRequest();
  const [agentId, setAgentId] = useState<string | null>(null);

  const request = detail.data;
  const nextStatus = request === undefined ? null : NEXT_STATUS[request.status];
  const isAssignedAgent =
    request?.assignedAgent?.id !== undefined &&
    request.assignedAgent.id === user?.id;
  const canAssign = user?.role === "AGENT" && request?.status === "NEW";
  const canTransition =
    user?.role === "AGENT" &&
    isAssignedAgent &&
    request !== undefined &&
    request.status !== "NEW" &&
    nextStatus !== null;
  const actionError = mutationMessage(
    assignRequest.error ?? transitionRequest.error,
  );

  const assign = () => {
    if (request === undefined || agentId === null) {
      return;
    }
    assignRequest.mutate({
      requestId: request.id,
      input: { assignedAgentId: agentId, version: request.version },
    });
  };

  const transition = () => {
    if (request === undefined || nextStatus === null) {
      return;
    }
    transitionRequest.mutate({
      requestId: request.id,
      input: { toStatus: nextStatus, version: request.version },
    });
  };

  return (
    <Sheet
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setAgentId(null);
          assignRequest.reset();
          transitionRequest.reset();
        }
        onOpenChange(isOpen);
      }}
      open={open}
    >
      <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
        {detail.isPending ? (
          <div className="space-y-4 p-5 pt-14">
            <Skeleton className="h-5 w-52" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : detail.isError || request === undefined ? (
          <div className="p-5 pt-14">
            <Alert variant="destructive">
              <AlertCircle aria-hidden="true" />
              <AlertTitle>Request unavailable</AlertTitle>
              <AlertDescription>
                This request could not be loaded or is not available to your
                account.
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <>
            <SheetHeader className="border-b pr-12">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={request.status} />
                <PriorityBadge priority={request.priority} />
              </div>
              <SheetTitle className="mt-2 text-lg leading-snug">
                {request.title}
              </SheetTitle>
              <SheetDescription className="font-mono text-[0.6875rem]">
                #{shortRequestId(request.id)} · opened{" "}
                {formatDateTime(request.createdAt)}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto">
              <section className="space-y-4 border-b p-5">
                <p className="whitespace-pre-wrap text-sm leading-6">
                  {request.description}
                </p>
                <div className="grid gap-3 rounded-lg border bg-muted/25 p-4 sm:grid-cols-2">
                  <div className="flex items-start gap-2">
                    <UserRound
                      aria-hidden="true"
                      className="mt-0.5 size-4 text-muted-foreground"
                    />
                    <div>
                      <p className="text-xs text-muted-foreground">Customer</p>
                      <p className="mt-0.5 text-sm font-medium">
                        {request.customer.displayName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <UserRound
                      aria-hidden="true"
                      className="mt-0.5 size-4 text-muted-foreground"
                    />
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Assigned Agent
                      </p>
                      <p className="mt-0.5 text-sm font-medium">
                        {request.assignedAgent?.displayName ?? "Unassigned"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 sm:col-span-2">
                    <CalendarClock
                      aria-hidden="true"
                      className="mt-0.5 size-4 text-muted-foreground"
                    />
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Response SLA
                      </p>
                      <SlaIndicator className="mt-1" request={request} />
                    </div>
                  </div>
                </div>
              </section>

              <section className="p-5">
                <h3 className="text-sm font-semibold">Status history</h3>
                <ol className="mt-4 space-y-0">
                  {request.statusHistory.map((event, index) => (
                    <li
                      className="relative flex gap-3 pb-5 last:pb-0"
                      key={event.id}
                    >
                      {index === request.statusHistory.length - 1 ? null : (
                        <span className="absolute top-5 bottom-0 left-[0.4375rem] w-px bg-border" />
                      )}
                      <span className="relative mt-1 grid size-4 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                        <CheckCircle2 aria-hidden="true" className="size-2.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {event.fromStatus === null
                            ? "Request created"
                            : `${STATUS_LABELS[event.fromStatus]} → ${STATUS_LABELS[event.toStatus]}`}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {event.actor.displayName} ·{" "}
                          {formatDateTime(event.createdAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            </div>

            {user?.role === "AGENT" ? (
              <SheetFooter className="border-t bg-muted/30">
                {actionError === null ? null : (
                  <Alert variant="destructive">
                    <AlertCircle aria-hidden="true" />
                    <AlertTitle>Action not completed</AlertTitle>
                    <AlertDescription>{actionError}</AlertDescription>
                  </Alert>
                )}
                {canAssign ? (
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <Select onValueChange={setAgentId} value={agentId}>
                      <SelectTrigger className="w-full">
                        <SelectValue>
                          {agents.data?.find((agent) => agent.id === agentId)
                            ?.displayName ?? "Choose an Agent"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {agents.data?.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id}>
                            {agent.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      disabled={agentId === null || assignRequest.isPending}
                      onClick={assign}
                    >
                      {assignRequest.isPending ? (
                        <LoaderCircle
                          aria-hidden="true"
                          className="animate-spin"
                        />
                      ) : null}
                      Assign request
                    </Button>
                  </div>
                ) : canTransition && nextStatus !== null ? (
                  <Button
                    className="w-full"
                    disabled={transitionRequest.isPending}
                    onClick={transition}
                    size="lg"
                  >
                    {transitionRequest.isPending ? (
                      <LoaderCircle
                        aria-hidden="true"
                        className="animate-spin"
                      />
                    ) : (
                      <ArrowRight aria-hidden="true" />
                    )}
                    {TRANSITION_LABELS[nextStatus] ??
                      `Move to ${STATUS_LABELS[nextStatus]}`}
                  </Button>
                ) : request.status === "CLOSED" ? (
                  <p className="text-center text-xs text-muted-foreground">
                    This request is closed. No further transitions are allowed.
                  </p>
                ) : (
                  <p className="text-center text-xs text-muted-foreground">
                    Only the assigned Agent may advance this request.
                  </p>
                )}
              </SheetFooter>
            ) : null}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
