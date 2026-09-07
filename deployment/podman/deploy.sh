#!/bin/bash
# Applies deployment/podman/*.yaml in order via `podman play kube` and sets
# Pulp's admin password (no postStart-hook equivalent exists under `podman
# play kube`). `up` also auto-generates 00-secret.yaml the first time it's
# missing; delete the file and re-run to get a fresh set.
#
# Usage:
#   ./deployment/podman/deploy.sh up      # deploy (default)
#   ./deployment/podman/deploy.sh down    # tear down (PVCs/volumes kept)
#
# Env vars (optional):
#   PULPIT_PUBLIC_ORIGIN    public origin CSRF checks against (default: http://localhost:8080)
#
# Images are pinned to :latest in pulp.yaml/pulpit.yaml - edit those files
# directly to deploy a specific tag.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${REPO_ROOT}"

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "${WORK_DIR}"' EXIT

PULPIT_PUBLIC_ORIGIN="${PULPIT_PUBLIC_ORIGIN:-http://localhost:8080}"

sed "s#__PULPIT_PUBLIC_ORIGIN__#${PULPIT_PUBLIC_ORIGIN}#" \
    "${SCRIPT_DIR}/00-configmap.yaml" > "${WORK_DIR}/00-configmap.yaml"

action="${1:-up}"

wait_healthy() {
    local container="$1"
    local attempt=0
    echo "Waiting for ${container} to become healthy..."
    until [ "$(podman inspect "${container}" --format '{{.State.Health.Status}}' 2>/dev/null)" = "healthy" ]; do
        attempt=$((attempt + 1))
        if [ "${attempt}" -ge 60 ]; then
            echo "${container} did not become healthy in time - check: podman logs ${container}" >&2
            exit 1
        fi
        sleep 5
    done
    echo "${container} is healthy."
}

# Generates 00-secret.yaml from the .example file with real random values.
# Only called when 00-secret.yaml doesn't exist yet - never overwrites one.
generate_secret_file() {
    echo "No deployment/podman/00-secret.yaml found - generating one with fresh secrets..." >&2

    local pulp_secret_key pulpit_core_secret_key pulp_admin_password
    pulp_secret_key="$(openssl rand -hex 32)"
    pulpit_core_secret_key="$(openssl rand -base64 32 | tr '+/' '-_')"
    pulp_admin_password="$(openssl rand -base64 18 | tr -d '=+/')"

    sed -E \
        -e "s#^(  PULP_SECRET_KEY:).*#\1 \"${pulp_secret_key}\"#" \
        -e "s#^(  PULP_ADMIN_PASSWORD:).*#\1 \"${pulp_admin_password}\"#" \
        -e "s#^(  PULPIT_CORE_SECRET_KEY:).*#\1 \"${pulpit_core_secret_key}\"#" \
        "${SCRIPT_DIR}/00-secret.example.yaml" > "${SCRIPT_DIR}/00-secret.yaml"
    chmod 600 "${SCRIPT_DIR}/00-secret.yaml"

    echo "Generated ${SCRIPT_DIR}/00-secret.yaml." >&2
    echo >&2
    echo "Pulp admin password: ${pulp_admin_password}" >&2
    echo "(shown once here - store it somewhere safe; it's also readable from 00-secret.yaml)" >&2
    echo >&2
}

up() {
    if [ ! -f "${SCRIPT_DIR}/00-secret.yaml" ]; then
        generate_secret_file
    fi

    # Podman ConfigMaps aren't standalone objects - each `play kube` call
    # must pass 00-configmap.yaml/00-secret.yaml in the SAME invocation as
    # any Pod referencing them, or it fails with "configmap ... not found".
    podman play kube "${SCRIPT_DIR}/redis.yaml"
    wait_healthy redis-redis
    podman play kube "${WORK_DIR}/00-configmap.yaml" "${SCRIPT_DIR}/00-secret.yaml" "${SCRIPT_DIR}/pulp.yaml"
    wait_healthy pulp-pulp

    echo "Setting Pulp's admin password..."
    podman exec pulp-pulp sh /usr/local/bin/pulpit-init-admin-password.sh

    podman play kube "${WORK_DIR}/00-configmap.yaml" "${SCRIPT_DIR}/00-secret.yaml" "${SCRIPT_DIR}/pulpit.yaml"
    wait_healthy pulpit-pulpit

    echo
    echo "Pulpit is up: http://localhost:8080/"
}

down() {
    podman play kube --down "${SCRIPT_DIR}/pulpit.yaml" 2>/dev/null || true
    podman play kube --down "${SCRIPT_DIR}/pulp.yaml" 2>/dev/null || true
    podman play kube --down "${SCRIPT_DIR}/redis.yaml" 2>/dev/null || true
}

case "${action}" in
    up) up ;;
    down) down ;;
    *)
        echo "Usage: $0 [up|down]" >&2
        exit 1
        ;;
esac
