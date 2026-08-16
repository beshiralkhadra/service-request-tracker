# ADR 0001: Application and Deployment Architecture

- Status: Accepted
- Date: 2026-08-16

## Context

The assessment requires a Next.js frontend, a REST backend, persistent data,
role-based authorization, strict request lifecycle rules, SLA tracking, a
design pattern, automated tests, CI/CD preparation, and Docker support.

The implementation must remain small enough to review while preserving clear
boundaries for authentication, request behavior, and later deployment work.

## Decision

1. Use a pnpm monorepo with `apps/web`, `apps/api`, and `packages/contracts`.
2. Use Next.js App Router as the web application and Express as the only REST
   and business-authorization boundary.
3. Proxy browser `/api` traffic through Next.js to keep cookies first-party and
   avoid separate public origins.
4. Use Prisma 7 with a local SQLite file for the assessment deployment.
5. Run exactly one API instance and persist SQLite on a Docker named volume.
6. Use shared Zod transport contracts, but do not expose Prisma models directly
   to the web application.
7. Use the State pattern for the exact request lifecycle.
8. Use TanStack Query for server state, Zustand for client-only state, and a
   minimal Auth Context for session orchestration.
9. Use short-lived in-memory access tokens and rotating opaque refresh cookies.
10. Treat initial assignment as the first response for SLA measurement.

## Rationale

The monorepo gives the assessment one lockfile and one repeatable quality gate,
while each application remains independently buildable. Shared contracts reduce
transport drift without coupling the browser to backend persistence.

Express makes the backend enforcement requirement explicit. Next.js rewrites
provide a same-origin browser experience but cannot bypass Express policies.

SQLite makes local and submitted setup deterministic. It is suitable for this
single-instance assessment, but it is not presented as a horizontally scalable
database. Prisma provides a clear path to PostgreSQL when deployment needs grow.

The State pattern fits the linear lifecycle and prevents transition rules from
being duplicated across HTTP handlers. Query, Zustand, and Context each have one
defined responsibility, avoiding duplicate server entities in client stores.

## Consequences

### Positive

- One command installs, validates, tests, and builds the whole repository.
- Business rules remain testable without Express or browser dependencies.
- Browser authentication cookies stay first-party.
- SQLite setup needs no separate database service.
- The request lifecycle has one explicit extension point.

### Negative

- SQLite requires one API writer and persistent host storage.
- Next.js and Express are two runtime processes rather than one deployment unit.
- Refresh-token rotation and proxy behavior require careful integration tests.
- Prisma SQLite enums need application validation and explicit SQL constraints.

## Alternatives Considered

### Next.js route handlers instead of Express

Rejected because the required stack explicitly calls for Express and a distinct
REST backend. It would also blur the backend enforcement boundary.

### PostgreSQL from the first phase

Operationally stronger, but rejected for this assessment setup after choosing
SQLite. The repository and Prisma boundaries preserve a later migration path.

### Redux Toolkit instead of Zustand

Rejected because Zustand is the prescribed primary state library. A minimal
Auth Context satisfies the assessment's Context API requirement without adding
a second general-purpose store.

### Local Storage access tokens

Rejected because XSS can read and exfiltrate bearer tokens from Local Storage.

### A status `switch` in every service

Rejected because lifecycle logic would be duplicated and harder to extend or
test. Concrete State objects keep transition behavior cohesive.

## Revisit Triggers

Revisit this decision when any of these become true:

- More than one API instance is required.
- Write contention becomes observable.
- The application needs high availability or multi-host deployment.
- Enterprise identity replaces local credentials.
- The lifecycle becomes branching or configurable by administrators.
