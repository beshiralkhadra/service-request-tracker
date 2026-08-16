import type {
  Agent,
  PaginatedServiceRequests,
  RequestStatus,
  ServiceRequest,
  ServiceRequestDetail,
  User,
} from "@service-request-tracker/contracts";

import {
  RequestStatus as PrismaRequestStatus,
  UserRole as PrismaUserRole,
} from "../../../generated/prisma/enums.js";
import type { AppPrismaClient } from "../../../shared/database/prisma.js";
import { ApplicationError } from "../../../shared/errors/application-error.js";
import type {
  RequestRepository,
  RequestViewer,
} from "../domain/request.ports.js";

interface PersistedUser {
  id: string;
  email: string;
  displayName: string;
  role: "CUSTOMER" | "AGENT";
}

interface PersistedRequest {
  id: string;
  title: string;
  description: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  status: RequestStatus;
  slaDueAt: Date;
  respondedAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  customer: PersistedUser;
  assignedAgent: PersistedUser | null;
}

interface PersistedHistory {
  id: string;
  fromStatus: RequestStatus | null;
  toStatus: RequestStatus;
  createdAt: Date;
  actor: PersistedUser;
}

const publicUser = (user: PersistedUser): User => ({ ...user });

const requestResponse = (request: PersistedRequest): ServiceRequest => ({
  id: request.id,
  title: request.title,
  description: request.description,
  priority: request.priority,
  status: request.status,
  slaDueAt: request.slaDueAt.toISOString(),
  respondedAt: request.respondedAt?.toISOString() ?? null,
  version: request.version,
  createdAt: request.createdAt.toISOString(),
  updatedAt: request.updatedAt.toISOString(),
  customer: publicUser(request.customer),
  assignedAgent:
    request.assignedAgent === null ? null : publicUser(request.assignedAgent),
});

const detailResponse = (
  request: PersistedRequest & { statusHistory: PersistedHistory[] },
): ServiceRequestDetail => ({
  ...requestResponse(request),
  statusHistory: request.statusHistory.map((history) => ({
    id: history.id,
    fromStatus: history.fromStatus,
    toStatus: history.toStatus,
    createdAt: history.createdAt.toISOString(),
    actor: publicUser(history.actor),
  })),
});

const requestInclude = {
  customer: {
    select: { id: true, email: true, displayName: true, role: true },
  },
  assignedAgent: {
    select: { id: true, email: true, displayName: true, role: true },
  },
} as const;

const detailInclude = {
  ...requestInclude,
  statusHistory: {
    include: {
      actor: {
        select: { id: true, email: true, displayName: true, role: true },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

export class PrismaRequestRepository implements RequestRepository {
  constructor(private readonly prisma: AppPrismaClient) {}

  create(input: Parameters<RequestRepository["create"]>[0]) {
    return this.prisma.$transaction(async (transaction) => {
      const request = await transaction.serviceRequest.create({
        data: {
          customerId: input.customerId,
          title: input.request.title,
          description: input.request.description,
          priority: input.request.priority,
          status: PrismaRequestStatus.NEW,
          slaDueAt: input.slaDueAt,
          createdAt: input.now,
        },
      });

      await transaction.requestStatusHistory.create({
        data: {
          requestId: request.id,
          actorId: input.customerId,
          fromStatus: null,
          toStatus: PrismaRequestStatus.NEW,
          createdAt: input.now,
        },
      });

      const detail = await transaction.serviceRequest.findUniqueOrThrow({
        where: { id: request.id },
        include: detailInclude,
      });
      return detailResponse(detail);
    });
  }

  async list(
    viewer: RequestViewer,
    query: Parameters<RequestRepository["list"]>[1],
  ): Promise<PaginatedServiceRequests> {
    const where = {
      ...(viewer.role === "CUSTOMER" ? { customerId: viewer.id } : {}),
      ...(query.status === undefined ? {} : { status: query.status }),
    };
    const skip = (query.page - 1) * query.pageSize;
    const [totalItems, requests] = await this.prisma.$transaction([
      this.prisma.serviceRequest.count({ where }),
      this.prisma.serviceRequest.findMany({
        where,
        include: requestInclude,
        orderBy: { createdAt: "desc" },
        skip,
        take: query.pageSize,
      }),
    ]);

    return {
      data: requests.map(requestResponse),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / query.pageSize),
      },
    };
  }

  async findDetail(
    requestId: string,
    viewer: RequestViewer,
  ): Promise<ServiceRequestDetail | null> {
    const request = await this.prisma.serviceRequest.findFirst({
      where: {
        id: requestId,
        ...(viewer.role === "CUSTOMER" ? { customerId: viewer.id } : {}),
      },
      include: detailInclude,
    });
    return request === null ? null : detailResponse(request);
  }

  async findForMutation(requestId: string) {
    return this.prisma.serviceRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        status: true,
        version: true,
        assignedAgentId: true,
      },
    });
  }

  assign(input: Parameters<RequestRepository["assign"]>[0]) {
    return this.prisma.$transaction(async (transaction) => {
      const agent = await transaction.user.findUnique({
        where: { id: input.assignedAgentId },
        select: { role: true },
      });
      if (agent?.role !== PrismaUserRole.AGENT) {
        throw new ApplicationError(
          "ASSIGNEE_MUST_BE_AGENT",
          "A service request may only be assigned to an Agent.",
        );
      }

      const updated = await transaction.serviceRequest.updateMany({
        where: {
          id: input.requestId,
          status: PrismaRequestStatus.NEW,
          assignedAgentId: null,
          version: input.expectedVersion,
        },
        data: {
          status: PrismaRequestStatus.ASSIGNED,
          assignedAgentId: input.assignedAgentId,
          respondedAt: input.now,
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) {
        throw new ApplicationError(
          "STALE_REQUEST_VERSION",
          "The request changed before this assignment was applied.",
        );
      }

      await transaction.requestStatusHistory.create({
        data: {
          requestId: input.requestId,
          actorId: input.actorId,
          fromStatus: PrismaRequestStatus.NEW,
          toStatus: PrismaRequestStatus.ASSIGNED,
          createdAt: input.now,
        },
      });

      const detail = await transaction.serviceRequest.findUniqueOrThrow({
        where: { id: input.requestId },
        include: detailInclude,
      });
      return detailResponse(detail);
    });
  }

  transition(input: Parameters<RequestRepository["transition"]>[0]) {
    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.serviceRequest.updateMany({
        where: {
          id: input.requestId,
          status: input.fromStatus,
          assignedAgentId: input.assignedAgentId,
          version: input.expectedVersion,
        },
        data: {
          status: input.toStatus,
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) {
        throw new ApplicationError(
          "STALE_REQUEST_VERSION",
          "The request changed before this transition was applied.",
        );
      }

      await transaction.requestStatusHistory.create({
        data: {
          requestId: input.requestId,
          actorId: input.actorId,
          fromStatus: input.fromStatus,
          toStatus: input.toStatus,
          createdAt: input.now,
        },
      });

      const detail = await transaction.serviceRequest.findUniqueOrThrow({
        where: { id: input.requestId },
        include: detailInclude,
      });
      return detailResponse(detail);
    });
  }

  async listAgents(): Promise<Agent[]> {
    const agents = await this.prisma.user.findMany({
      where: { role: PrismaUserRole.AGENT },
      select: { id: true, email: true, displayName: true, role: true },
      orderBy: { displayName: "asc" },
    });
    return agents.map((agent) => ({ ...agent, role: "AGENT" }));
  }
}
