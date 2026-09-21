#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")"

if (( $# != 0 )); then
  echo "Usage: $0" >&2
  exit 2
fi

docker compose -f deployment/docker/compose-dev.yml --env-file .env down
