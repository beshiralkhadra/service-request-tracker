# syntax=docker/dockerfile:1.7

FROM node:24-bookworm-slim AS build

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY apps/api apps/api
COPY packages/contracts packages/contracts

RUN pnpm build:contracts \
    && pnpm db:generate \
    && pnpm --filter @service-request-tracker/api build \
    && pnpm --filter @service-request-tracker/api deploy --legacy /opt/api \
    && cp -R apps/api/dist /opt/api/dist \
    && cp -R apps/api/prisma /opt/api/prisma \
    && cp apps/api/prisma.config.ts /opt/api/prisma.config.ts

FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV API_PORT=4000

WORKDIR /app

COPY --from=build --chown=node:node /opt/api ./

RUN mkdir -p /data && chown node:node /data

USER node

EXPOSE 4000

HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:4000/health/live').then((response) => { if (!response.ok) process.exit(1) }).catch(() => process.exit(1))"

CMD ["node", "dist/server.js"]