#!/bin/sh
set -eu

compose_file=${COMPOSE_FILE:-compose.production.yaml}
environment_file=${ENV_FILE:-.env}

docker compose --env-file "$environment_file" -f "$compose_file" pull
docker compose --env-file "$environment_file" -f "$compose_file" up \
  --detach --remove-orphans --wait

web_port=$(sed -n 's/^WEB_PORT=//p' "$environment_file" | tail -n 1)
web_port=${web_port:-3000}

curl --fail --retry 12 --retry-all-errors --retry-delay 5 \
  "http://127.0.0.1:${web_port}/api/health/ready"

docker image prune --force