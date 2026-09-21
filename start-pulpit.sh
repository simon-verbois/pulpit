#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")"

case "$#:${1:-}" in
  0:)
    docker compose -f deployment/docker/compose-dev.yml --env-file .env down
    ;;
  1:--reset)
    docker compose -f deployment/docker/compose-dev.yml --env-file .env down --volumes
    ;;
  *)
    echo "Usage: $0 [--reset]" >&2
    exit 2
    ;;
esac

docker compose -f deployment/docker/compose-dev.yml --env-file .env up -d --build
