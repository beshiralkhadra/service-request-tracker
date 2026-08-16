# syntax=docker/dockerfile:1.7

FROM node:24-bookworm-slim AS build

ARG API_INTERNAL_URL=http://api:4000

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NEXT_TELEMETRY_DISABLED=1
ENV API_INTERNAL_URL=$API_INTERNAL_URL

RUN corepack enable

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY apps/web apps/web
COPY packages/contracts packages/contracts

RUN pnpm build:contracts \
  && pnpm --filter @service-request-tracker/web build \
  && source_helpers="$(find node_modules/.pnpm -maxdepth 1 -type d -name '@swc+helpers@*' | head -n 1)/node_modules/@swc/helpers" \
  && traced_helpers="$(find apps/web/.next/standalone/node_modules/.pnpm -maxdepth 1 -type d -name '@swc+helpers@*' | head -n 1)/node_modules/@swc/helpers" \
  && rm -rf "$traced_helpers" \
  && cp -R "$source_helpers" "$traced_helpers"

FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

WORKDIR /app

COPY --from=build --chown=node:node /workspace/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /workspace/apps/web/.next/static ./apps/web/.next/static

USER node

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000').then((response) => { if (!response.ok) process.exit(1) }).catch(() => process.exit(1))"

WORKDIR /app/apps/web

CMD ["node", "server.js"]