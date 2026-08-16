"use client";

import { ChevronRight } from "lucide-react";

import type { ServiceRequest } from "@service-request-tracker/contracts";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { formatDateTime, shortRequestId } from "../lib/request-presentation";
import { PriorityBadge, StatusBadge } from "./request-badges";
import { SlaIndicator } from "./sla-indicator";

interface RequestListProps {
  onSelect: (requestId: string) => void;
  requests: ServiceRequest[];
}

export function RequestList({ onSelect, requests }: RequestListProps) {
  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="pl-5">Request</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Response SLA</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="max-w-80 pl-5 whitespace-normal">
                  <button
                    className="block w-full text-left outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => onSelect(request.id)}
                    type="button"
                  >
                    <span className="line-clamp-1 font-medium">
                      {request.title}
                    </span>
                    <span className="mt-1 block font-mono text-[0.6875rem] text-muted-foreground">
                      #{shortRequestId(request.id)} ·{" "}
                      {formatDateTime(request.createdAt)}
                    </span>
                  </button>
                </TableCell>
                <TableCell>
                  <StatusBadge status={request.status} />
                </TableCell>
                <TableCell>
                  <PriorityBadge priority={request.priority} />
                </TableCell>
                <TableCell>
                  <SlaIndicator request={request} />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {request.assignedAgent?.displayName ?? "Unassigned"}
                </TableCell>
                <TableCell>
                  <Button
                    aria-label={`View ${request.title}`}
                    onClick={() => onSelect(request.id)}
                    size="icon-sm"
                    variant="ghost"
                  >
                    <ChevronRight aria-hidden="true" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="divide-y md:hidden">
        {requests.map((request) => (
          <button
            className="grid w-full gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            key={request.id}
            onClick={() => onSelect(request.id)}
            type="button"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {request.title}
                </p>
                <p className="mt-1 font-mono text-[0.6875rem] text-muted-foreground">
                  #{shortRequestId(request.id)}
                </p>
              </div>
              <ChevronRight
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={request.status} />
              <PriorityBadge priority={request.priority} />
            </div>
            <SlaIndicator request={request} />
          </button>
        ))}
      </div>
    </>
  );
}
