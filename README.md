# Service Request Tracker

A production-style full-stack service request tracker demonstrating secure
authentication, backend-enforced authorization, transactional lifecycle rules,
live SLA tracking, automated testing, and containerized delivery.

## Reviewer Quick Start

This repository is self-contained; no private assessment files are required.
The quickest review path is the Docker setup:

```bash
cp .env.example .env
docker compose up --build -d
```

Open <http://localhost:3000>. You can either register a new Customer account or
use the example Agent credentials defined in `.env.example`:

```text
Email: agent@example.com
Password: change-this-agent-password
```

Useful review entry points:

- [System design and data flows](docs/system-design.md)
- [Architecture decisions and tradeoffs](docs/adr/0001-architecture.md)
- [Prisma domain model](apps/api/prisma/schema.prisma)
- [Lifecycle State pattern](apps/api/src/features/requests/domain/request-lifecycle.ts)
- [Backend authorization and lifecycle integration tests](apps/api/src/features/requests/presentation/service-request.integration.test.ts)
- [Automated browser lifecycle](e2e/service-request-lifecycle.spec.ts)
- [CI/CD workflow](.github/workflows/ci-cd.yml)

To run the primary quality gates locally:

```bash
pnpm install --frozen-lockfile
pnpm test:coverage
pnpm exec playwright install chromium
pnpm test:e2e
```

When sharing this public repository with reviewers, the repository URL alone is
enough to reproduce the application and inspect the engineering decisions.

## Implementation Status

Phases 1 through 5 are complete:

- Next.js 16 App Router web application with TypeScript, Tailwind CSS, and
  ShadCN UI.
- Express 5 API with typed configuration, structured logging, security
  middleware, and liveness/readiness endpoints.
- Prisma 7 and SQLite data model with migrations and database-level checks.
- Shared Zod transport contracts for roles, priorities, statuses, pagination,
  SLA targets, and problem details.
- Idempotent environment-driven Agent seed.
- Responsive service request workspace shell.
- Production Docker images and Compose deployment with persistent SQLite.
- Baseline Vitest, Testing Library, and Supertest coverage.
- System design and architecture decision documentation.
- Customer registration and Agent/Customer login.
- Short-lived JWT access tokens and rotating hashed refresh sessions.
- Backend-enforced Customer ownership and Agent role permissions.
- Request creation, status filtering, detail/history, assignment, and lifecycle
  transitions.
- State-pattern lifecycle enforcement, transactional audit history, SLA
  deadlines, and optimistic concurrency checks.
- Axios bearer-token and single-flight refresh interceptors.
- In-memory Zustand session state and client-only request filters.
- Minimal Auth Context refresh bootstrap.
- TanStack Query providers, query keys, typed request hooks, and mutation cache
  invalidation.
- Custom hooks for authentication, request lists/details, Agents, creation,
  assignment, and status transitions.
- Responsive login and Customer registration screens.
- Role-aware Customer and Agent request dashboards with status filtering and
  pagination.
- Validated request creation, Agent assignment, and exact-next transition
  controls.
- Request detail sheets with ownership, full status history, and terminal-state
  handling.
- Live response SLA countdowns and frozen met/breached outcomes.
- Desktop and mobile browser verification of the full Customer-to-Agent
  lifecycle.
- Enforced coverage thresholds with LCOV/JSON CI artifacts.
- Isolated Playwright lifecycle and responsive workflow automation.
- GitHub Actions gates for formatting, linting, types, coverage, builds,
  browser tests, and Docker images.
- Immutable GHCR image publication and protected single-host deployment.

The application is ready for repository submission and deployment configuration.

## Repository Layout

```text
apps/
  api/                 Express REST API and Prisma schema
  web/                 Next.js web application
packages/
  contracts/           Shared Zod transport contracts
docs/
  adr/                  Architecture decisions
  system-design.md      Assessment system-design document
```

## Prerequisites

- Node.js 24 or newer
- pnpm 11.17.0 through Corepack
- Docker Desktop with Docker Compose v2 or newer

Enable the package manager if needed:

```bash
corepack enable
```

## Local Setup

Install dependencies:

```bash
pnpm install --frozen-lockfile
```

Create `apps/api/.env` with local API settings:

```dotenv
DATABASE_URL=file:./prisma/dev.db
API_PORT=4000
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=info
SEED_AGENT_EMAIL=agent@example.com
SEED_AGENT_NAME=Support Agent
SEED_AGENT_PASSWORD=use-a-unique-password-of-at-least-12-characters
JWT_ACCESS_SECRET=replace-with-at-least-32-random-characters
REFRESH_TOKEN_PEPPER=replace-with-at-least-32-random-characters
ACCESS_TOKEN_TTL_SECONDS=900
REFRESH_TOKEN_TTL_DAYS=30
PASSWORD_HASH_ROUNDS=12
AUTH_COOKIE_SECURE=false
```

Generate the Prisma client, migrate, seed, and verify the database:

```bash
pnpm db:generate
pnpm db:migrate:deploy
pnpm db:seed
pnpm db:verify
```

Start both applications:

```bash
pnpm dev
```

Local URLs:

- Web: <http://localhost:3000>
- API liveness: <http://localhost:4000/health/live>
- API readiness: <http://localhost:4000/health/ready>
- Same-origin readiness proxy: <http://localhost:3000/api/health/ready>

## Docker Setup

Create an untracked root `.env` containing at least:

```dotenv
SEED_AGENT_PASSWORD=use-a-unique-password-of-at-least-12-characters
SEED_AGENT_EMAIL=agent@example.com
SEED_AGENT_NAME=Support Agent
JWT_ACCESS_SECRET=replace-with-at-least-32-random-characters
REFRESH_TOKEN_PEPPER=replace-with-at-least-32-random-characters
AUTH_COOKIE_SECURE=false
```

Build and start the stack:

```bash
docker compose up --build -d
```

Compose performs these steps in order:

1. Initializes named-volume ownership.
2. Applies pending Prisma migrations.
3. Seeds the Agent idempotently.
4. Starts one Express API instance.
5. Starts Next.js after the API reports healthy.

Inspect services and stop them without deleting data:

```bash
docker compose ps
docker compose down
```

Delete the local database volume only when intentionally resetting all data:

```bash
docker compose down --volumes
```

SQLite deployment is restricted to one API instance. See
[`docs/system-design.md`](docs/system-design.md) for scaling and backup limits.

## Quality Commands

Run all repository checks from the root:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Run enforced coverage gates and the isolated browser workflow:

```bash
pnpm test:coverage
pnpm exec playwright install chromium
pnpm test:e2e
```

The E2E preparation command recreates `.e2e/service-request-tracker.db`, applies
the real Prisma migration, seeds an Agent, and starts dedicated services on
ports `3100` and `4100`. It never uses the local development or Docker database.

Database checks:

```bash
pnpm db:validate
pnpm db:generate
pnpm db:migrate:deploy
pnpm db:seed
pnpm db:verify
```

Docker checks:

```bash
docker compose config --quiet
docker compose build
```

Current global coverage floors:

| Workspace | Statements | Branches | Functions | Lines |
| --------- | ---------: | -------: | --------: | ----: |
| Contracts |       100% |     100% |      100% |  100% |
| API       |        90% |      70% |       95% |   90% |
| Web       |        85% |      70% |       80% |   85% |

## CI/CD

The [CI/CD workflow](.github/workflows/ci-cd.yml) runs on pull requests, pushes
to `main`, and manual dispatches:

1. `quality`: Prisma validation/generation, formatting, lint, strict types,
   coverage thresholds, production builds, and coverage artifact upload.
2. `browser`: installs Chromium and runs the isolated Customer/Agent Playwright
   lifecycle with trace, video, and screenshot artifacts on failure.
3. `containers`: builds API and web images independently with BuildKit cache.
4. `publish`: after all gates pass on `main`, publishes SHA-pinned and `latest`
   images to GitHub Container Registry.
5. `deploy`: optional protected-environment deployment to one Docker host,
   followed by the same-origin readiness probe.

Image names are derived from the repository:

```text
ghcr.io/<owner>/<repository>-api:<commit-sha>
ghcr.io/<owner>/<repository>-web:<commit-sha>
```

### Production Environment

Create a GitHub Environment named `production` and add an approval rule before
enabling deployment. Configure these repository/environment variables:

| Variable            | Purpose                                          |
| ------------------- | ------------------------------------------------ |
| `ENABLE_DEPLOYMENT` | Set to `true` only when the host is ready        |
| `PRODUCTION_URL`    | Public HTTPS URL displayed by GitHub deployments |

Configure these protected secrets:

| Secret                | Purpose                                           |
| --------------------- | ------------------------------------------------- |
| `DEPLOY_HOST`         | SSH hostname or IP                                |
| `DEPLOY_USER`         | Non-root user allowed to run Docker               |
| `DEPLOY_PATH`         | Absolute host directory for the deployment bundle |
| `DEPLOY_SSH_KEY`      | Private SSH key for the deploy user               |
| `DEPLOY_KNOWN_HOSTS`  | Pinned `ssh-keyscan` output for the host          |
| `PRODUCTION_ENV_FILE` | Multiline runtime environment shown below         |

Example `PRODUCTION_ENV_FILE` value:

```dotenv
PUBLIC_ORIGIN=https://service.example.com
WEB_BIND_ADDRESS=127.0.0.1
WEB_PORT=3000
SEED_AGENT_EMAIL=agent@example.com
SEED_AGENT_NAME=Support Agent
SEED_AGENT_PASSWORD=replace-with-a-unique-secret
JWT_ACCESS_SECRET=replace-with-at-least-32-random-characters
REFRESH_TOKEN_PEPPER=replace-with-at-least-32-random-characters
AUTH_COOKIE_SECURE=true
LOG_LEVEL=info
```

The host needs Docker Engine, Compose v2, `curl`, persistent disk space, and a
TLS reverse proxy forwarding the public origin to `127.0.0.1:3000`. The workflow
uploads [compose.production.yaml](compose.production.yaml) and the verified
[deployment script](scripts/deploy-production.sh), pulls the exact commit images,
runs volume initialization/migrations/seed, waits for health, and prunes old
unused image layers. SQLite still requires exactly one API instance.

## Environment Variables

| Name                       | Required  | Purpose                                       |
| -------------------------- | --------- | --------------------------------------------- |
| `DATABASE_URL`             | API       | Prisma SQLite URL                             |
| `API_PORT`                 | No        | Express listener, default `4000`              |
| `CORS_ORIGIN`              | No        | Allowed browser origin                        |
| `LOG_LEVEL`                | No        | Pino log level                                |
| `SEED_AGENT_EMAIL`         | Seed      | Initial Agent email                           |
| `SEED_AGENT_NAME`          | No        | Initial Agent display name                    |
| `SEED_AGENT_PASSWORD`      | Seed      | Initial Agent password, minimum 12 characters |
| `API_INTERNAL_URL`         | Web build | Internal Express origin for Next.js rewrites  |
| `JWT_ACCESS_SECRET`        | API       | Access-token signing secret, minimum 32 chars |
| `REFRESH_TOKEN_PEPPER`     | API       | Refresh-token hash secret, minimum 32 chars   |
| `ACCESS_TOKEN_TTL_SECONDS` | No        | Access-token lifetime, default `900`          |
| `REFRESH_TOKEN_TTL_DAYS`   | No        | Refresh-session lifetime, default `30` days   |
| `PASSWORD_HASH_ROUNDS`     | No        | bcrypt work factor, default `12`              |
| `AUTH_COOKIE_SECURE`       | No        | Require HTTPS for refresh cookie              |

Never commit production secrets or a generated SQLite database.

## Assessment Mapping

| Requirement                  | Implementation location                                                 |
| ---------------------------- | ----------------------------------------------------------------------- |
| React and Next.js            | `apps/web`                                                              |
| Express REST backend         | `apps/api`                                                              |
| Prisma database              | `apps/api/prisma`                                                       |
| ShadCN and Tailwind          | `apps/web/src/components/ui`, `globals.css`                             |
| Zustand and Context boundary | In-memory auth/filter stores and minimal Auth Context in `apps/web`     |
| TanStack Query and Axios     | Typed feature hooks and single-flight auth interceptors in `apps/web`   |
| State design pattern         | Concrete request states in `apps/api/src/features/requests/domain`      |
| SLA targets                  | Shared contract, transactional API, live countdown, and breach UI       |
| Responsive design            | Mobile queue, navigation, forms, and full-width request detail          |
| Automated tests              | Contract, lifecycle, auth/request API, hooks, forms, and workflow tests |
| Docker                       | App Dockerfiles and `compose.yaml`                                      |
| System design                | `docs/system-design.md`                                                 |
| CI/CD                        | GitHub Actions implemented in Phase 5                                   |

## Design Documents

- [System design](docs/system-design.md)
- [ADR 0001: Application and deployment architecture](docs/adr/0001-architecture.md)
