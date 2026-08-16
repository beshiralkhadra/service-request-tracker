-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CUSTOMER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_role_check" CHECK ("role" IN ('CUSTOMER', 'AGENT'))
);

-- CreateTable
CREATE TABLE "RefreshSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "revokedAt" DATETIME,
    "rotatedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RefreshSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ServiceRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "assignedAgentId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "slaDueAt" DATETIME NOT NULL,
    "respondedAt" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServiceRequest_priority_check" CHECK ("priority" IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
    CONSTRAINT "ServiceRequest_status_check" CHECK ("status" IN ('NEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
    CONSTRAINT "ServiceRequest_version_check" CHECK ("version" >= 0),
    CONSTRAINT "ServiceRequest_assignment_shape_check" CHECK (
        ("status" = 'NEW' AND "assignedAgentId" IS NULL AND "respondedAt" IS NULL)
        OR
        ("status" IN ('ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') AND "assignedAgentId" IS NOT NULL AND "respondedAt" IS NOT NULL)
    ),
    CONSTRAINT "ServiceRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ServiceRequest_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RequestStatusHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RequestStatusHistory_fromStatus_check" CHECK ("fromStatus" IS NULL OR "fromStatus" IN ('NEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED')),
    CONSTRAINT "RequestStatusHistory_toStatus_check" CHECK ("toStatus" IN ('NEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
    CONSTRAINT "RequestStatusHistory_transition_check" CHECK (
        ("fromStatus" IS NULL AND "toStatus" = 'NEW')
        OR ("fromStatus" = 'NEW' AND "toStatus" = 'ASSIGNED')
        OR ("fromStatus" = 'ASSIGNED' AND "toStatus" = 'IN_PROGRESS')
        OR ("fromStatus" = 'IN_PROGRESS' AND "toStatus" = 'RESOLVED')
        OR ("fromStatus" = 'RESOLVED' AND "toStatus" = 'CLOSED')
    ),
    CONSTRAINT "RequestStatusHistory_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ServiceRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RequestStatusHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_createdAt_idx" ON "User"("role", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshSession_tokenHash_key" ON "RefreshSession"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshSession_userId_revokedAt_expiresAt_idx" ON "RefreshSession"("userId", "revokedAt", "expiresAt");

-- CreateIndex
CREATE INDEX "ServiceRequest_customerId_status_createdAt_idx" ON "ServiceRequest"("customerId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceRequest_status_createdAt_idx" ON "ServiceRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceRequest_assignedAgentId_status_updatedAt_idx" ON "ServiceRequest"("assignedAgentId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "ServiceRequest_status_slaDueAt_idx" ON "ServiceRequest"("status", "slaDueAt");

-- CreateIndex
CREATE INDEX "RequestStatusHistory_requestId_createdAt_idx" ON "RequestStatusHistory"("requestId", "createdAt");

-- CreateIndex
CREATE INDEX "RequestStatusHistory_actorId_createdAt_idx" ON "RequestStatusHistory"("actorId", "createdAt");
