#!/bin/bash
# Bootstraps a local .env (repo root) from .env.example with real random
# secrets instead of making you hand-edit them - same three values
# deployment/podman/deploy.sh and deployment/kube/deploy.sh auto-generate
# for their own 00-secret.yaml (PULP_SECRET_KEY, PULPIT_CORE_SECRET_KEY, a
# random PULP_ADMIN_PASSWORD), generated the same way (openssl rand -hex 32;
# a Fernet key is just base64(32 random bytes) with a urlsafe alphabet,
# which is exactly what `openssl rand -base64 32 | tr '+/' '-_'` produces,
# no python dependency needed). Compose itself has no equivalent Secret
# object to generate into - .env is the whole story here (docs/DEPLOYMENT.md).
#
# Refuses to touch an existing .env - delete it first (or edit it by hand)
# if you want a fresh one.
#
# Usage: ./deployment/docker/generate-env.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ENV_FILE="${REPO_ROOT}/.env"

if [ -f "${ENV_FILE}" ]; then
    echo ".env already exists at ${ENV_FILE} - not overwriting. Delete it first if you want a fresh one." >&2
    exit 1
fi

PULP_SECRET_KEY="$(openssl rand -hex 32)"
PULPIT_CORE_SECRET_KEY="$(openssl rand -base64 32 | tr '+/' '-_')"
PULP_ADMIN_PASSWORD="$(openssl rand -base64 18 | tr -d '=+/')"

sed -E \
    -e "s#^PULP_SECRET_KEY=.*#PULP_SECRET_KEY=${PULP_SECRET_KEY}#" \
    -e "s#^PULPIT_CORE_SECRET_KEY=.*#PULPIT_CORE_SECRET_KEY=${PULPIT_CORE_SECRET_KEY}#" \
    -e "s#^PULP_ADMIN_PASSWORD=.*#PULP_ADMIN_PASSWORD=${PULP_ADMIN_PASSWORD}#" \
    "${REPO_ROOT}/.env.example" > "${ENV_FILE}"
chmod 600 "${ENV_FILE}"

echo "Generated ${ENV_FILE} with fresh secrets."
echo
echo "Pulp admin password: ${PULP_ADMIN_PASSWORD}"
echo "(shown once here - store it somewhere safe; it's also readable from .env)"
echo
echo "Next: make compose-up (or docker compose -f deployment/docker/compose-dev.yml --env-file .env up -d --build)"
