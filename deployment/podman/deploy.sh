#!/bin/bash
# Applies deployment/podman/*.yaml in the right order via `podman play kube`,
# substituting the two placeholders YAML itself can't express
# (__PULPIT_PODMAN_SOCKET_PATH__, __PULPIT_REPO_ROOT__ - see
# docker-socket-proxy.yaml/pulp.yaml's own comments), and runs the one step
# `podman play kube` genuinely cannot do at all (setting Pulp's admin
# password - VERIFIED live no postStart-hook equivalent exists - see
# pulp.yaml's own comment).
#
# Usage:
#   ./deployment/podman/deploy.sh up      # deploy (default if no argument given)
#   ./deployment/podman/deploy.sh down    # tear down (PVCs/volumes kept)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${REPO_ROOT}"

PULPIT_PODMAN_SOCKET="${PULPIT_PODMAN_SOCKET:-/run/user/$(id -u)/podman/podman.sock}"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "${WORK_DIR}"' EXIT

sed "s#__PULPIT_PODMAN_SOCKET_PATH__#${PULPIT_PODMAN_SOCKET}#" \
    "${SCRIPT_DIR}/docker-socket-proxy.yaml" > "${WORK_DIR}/docker-socket-proxy.yaml"
sed "s#__PULPIT_REPO_ROOT__#${REPO_ROOT}#" \
    "${SCRIPT_DIR}/pulp.yaml" > "${WORK_DIR}/pulp.yaml"

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

up() {
    if [ ! -f "${SCRIPT_DIR}/00-secret.yaml" ]; then
        echo "Missing deployment/podman/00-secret.yaml - copy 00-secret.example.yaml and fill it in first." >&2
        exit 1
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
    podman play kube "${WORK_DIR}/docker-socket-proxy.yaml"
    podman play kube "${SCRIPT_DIR}/00-configmap.yaml" "${SCRIPT_DIR}/00-secret.yaml" "${WORK_DIR}/pulp.yaml"
    wait_healthy pulp-pulp

    echo "Setting Pulp's admin password (see pulp.yaml's own comment on why this can't be a postStart hook here)..."
    podman exec pulp-pulp sh /usr/local/bin/pulpit-init-admin-password.sh

    podman play kube "${SCRIPT_DIR}/00-configmap.yaml" "${SCRIPT_DIR}/00-secret.yaml" "${SCRIPT_DIR}/pulpit.yaml"
    wait_healthy pulpit-pulpit

    echo
    echo "Pulpit is up: http://localhost:8080/"
}

down() {
    podman play kube --down "${SCRIPT_DIR}/pulpit.yaml" 2>/dev/null || true
    podman play kube --down "${WORK_DIR}/pulp.yaml" 2>/dev/null || true
    podman play kube --down "${WORK_DIR}/docker-socket-proxy.yaml" 2>/dev/null || true
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
