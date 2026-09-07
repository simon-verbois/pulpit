#!/bin/bash
# Applies deployment/podman/*.yaml in the right order via `podman play kube`,
# substituting the placeholder tokens YAML itself can't express (image tags,
# public origin - see each file's own comment on why), and runs the one step
# `podman play kube` genuinely cannot do at all (setting Pulp's admin
# password - VERIFIED live no postStart-hook equivalent exists - see
# pulp.yaml's own comment). `up` also auto-generates deployment/podman/
# 00-secret.yaml (from 00-secret.example.yaml, with real random values) the
# first time it's missing - see generate_secret_file() below - so a first
# deploy needs no manual secret-editing step; delete the file and re-run to
# get a fresh set instead.
#
# Usage:
#   ./deployment/podman/deploy.sh up      # deploy (default if no argument given)
#   ./deployment/podman/deploy.sh down    # tear down (PVCs/volumes kept)
#
# Env vars (all optional, same names/defaults as Compose's .env - see
# README.md "Pinning versions and overriding config"):
#   PULP_PULPIT_IMAGE_TAG   tag of docker.io/simonverbois/pulp-pulpit (default: latest)
#   PULPIT_IMAGE_TAG        tag of docker.io/simonverbois/pulpit (default: latest)
#   PULPIT_PUBLIC_ORIGIN    public origin CSRF checks against (default: http://localhost:8080)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${REPO_ROOT}"

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "${WORK_DIR}"' EXIT

PULP_PULPIT_IMAGE_TAG="${PULP_PULPIT_IMAGE_TAG:-latest}"
PULPIT_IMAGE_TAG="${PULPIT_IMAGE_TAG:-latest}"
PULPIT_PUBLIC_ORIGIN="${PULPIT_PUBLIC_ORIGIN:-http://localhost:8080}"

sed "s#__PULP_PULPIT_IMAGE_TAG__#${PULP_PULPIT_IMAGE_TAG}#" \
    "${SCRIPT_DIR}/pulp.yaml" > "${WORK_DIR}/pulp.yaml"

sed "s#__PULPIT_IMAGE_TAG__#${PULPIT_IMAGE_TAG}#" \
    "${SCRIPT_DIR}/pulpit.yaml" > "${WORK_DIR}/pulpit.yaml"

# The JSON-array-string wrapping (docs/DEPLOYMENT.md "CSRF_TRUSTED_ORIGINS")
# is done here, not in the YAML, so 00-configmap.yaml only ever needs to
# hold a single bare placeholder token.
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

# Generates deployment/podman/00-secret.yaml from the .example file with
# real random values instead of making the operator hand-edit REPLACE_ME -
# same three values .env.example/compose.yml need (PULP_SECRET_KEY,
# PULPIT_CORE_SECRET_KEY, PULP_ADMIN_PASSWORD), generated the same way their
# own comments already tell you to by hand (openssl rand -hex 32; a Fernet
# key is just base64(32 random bytes) with a urlsafe alphabet, which is
# exactly what `openssl rand -base64 32 | tr '+/' '-_'` produces, no python
# dependency needed). Only ever called when 00-secret.yaml doesn't exist
# yet - never overwrites one you already have.
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

    # VERIFIED live: "ConfigMaps in podman are not a standalone object and
    # must be used in a container" - unlike real Kubernetes, `play kube`
    # doesn't persist ConfigMap/Secret objects independently of the Pod(s)
    # that reference them. Every `play kube` call below that applies a Pod
    # with `envFrom: configMapRef`/`secretRef` passes 00-configmap.yaml/
    # 00-secret.yaml in that SAME invocation - applying them separately
    # first (as a real Kubernetes deployment naturally would) fails with
    # "configmap pulpit-config not found".
    podman play kube "${SCRIPT_DIR}/redis.yaml"
    wait_healthy redis-redis
    podman play kube "${WORK_DIR}/00-configmap.yaml" "${SCRIPT_DIR}/00-secret.yaml" "${WORK_DIR}/pulp.yaml"
    wait_healthy pulp-pulp

    echo "Setting Pulp's admin password (see pulp.yaml's own comment on why this can't be a postStart hook here)..."
    podman exec pulp-pulp sh /usr/local/bin/pulpit-init-admin-password.sh

    podman play kube "${WORK_DIR}/00-configmap.yaml" "${SCRIPT_DIR}/00-secret.yaml" "${WORK_DIR}/pulpit.yaml"
    wait_healthy pulpit-pulpit

    echo
    echo "Pulpit is up: http://localhost:8080/"
}

down() {
    podman play kube --down "${WORK_DIR}/pulpit.yaml" 2>/dev/null || true
    podman play kube --down "${WORK_DIR}/pulp.yaml" 2>/dev/null || true
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
