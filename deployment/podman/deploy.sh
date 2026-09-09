#!/bin/bash
# Applies deployment/podman/*.yaml in order via `podman play kube` and sets
# Pulp's admin password (no postStart-hook equivalent exists under `podman
# play kube`). `init` and `up` auto-generate 00-secret.yaml the first time
# it is missing; neither overwrites an existing secrets file.
#
# Usage:
#   ./deployment/podman/deploy.sh init    # generate secrets without deploying
#   ./deployment/podman/deploy.sh up      # deploy
#   ./deployment/podman/deploy.sh down    # stop (PVCs/volumes kept)
#   ./deployment/podman/deploy.sh reset   # delete runtime resources and data
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

render_configmap() {
    sed "s#__PULPIT_PUBLIC_ORIGIN__#${PULPIT_PUBLIC_ORIGIN}#g" \
        "${SCRIPT_DIR}/00-configmap.yaml" > "${WORK_DIR}/00-configmap.yaml"
}

usage() {
    cat <<EOF
Usage: $0 <init|up|down|reset>

Commands:
  init   Generate the local secrets file without deploying anything.
  up     Deploy or update Pulpit, preserving existing data.
  down   Stop Pulpit, preserving volumes and the local secrets file.
  reset  Stop Pulpit and permanently delete its volumes and images.

Environment:
  PULPIT_PUBLIC_ORIGIN   Public origin (default: http://localhost:8080)
  PULPIT_RESET_CONFIRM  Set to yes to run reset non-interactively.
EOF
}

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

init() {
    if [ ! -f "${SCRIPT_DIR}/00-secret.yaml" ]; then
        generate_secret_file
    else
        echo "Keeping existing ${SCRIPT_DIR}/00-secret.yaml."
    fi

    render_configmap
    echo "Initialization complete for ${PULPIT_PUBLIC_ORIGIN}. Run '$0 up' to deploy."
}

up() {
    if [ ! -f "${SCRIPT_DIR}/00-secret.yaml" ]; then
        generate_secret_file
    fi

    render_configmap

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
    echo "Pulpit is up: ${PULPIT_PUBLIC_ORIGIN}/"
}

down() {
    podman play kube --down "${SCRIPT_DIR}/pulpit.yaml" 2>/dev/null || true
    podman play kube --down "${SCRIPT_DIR}/pulp.yaml" 2>/dev/null || true
    podman play kube --down "${SCRIPT_DIR}/redis.yaml" 2>/dev/null || true
}

confirm_reset() {
    echo "WARNING: reset permanently deletes every Pulp/Pulpit Podman volume and removes its images when unused." >&2
    if [ "${PULPIT_RESET_CONFIRM:-}" = "yes" ]; then
        return
    fi
    if [ ! -t 0 ]; then
        echo "Refusing non-interactive reset. Set PULPIT_RESET_CONFIRM=yes to confirm." >&2
        exit 1
    fi
    read -r -p "Type 'reset' to continue: " confirmation
    if [ "${confirmation}" != "reset" ]; then
        echo "Reset cancelled."
        exit 0
    fi
}

reset() {
    confirm_reset

    podman play kube --down --force "${SCRIPT_DIR}/pulpit.yaml" 2>/dev/null || true
    podman play kube --down --force "${SCRIPT_DIR}/pulp.yaml" 2>/dev/null || true
    podman play kube --down --force "${SCRIPT_DIR}/redis.yaml" 2>/dev/null || true

    # Exact manifest-owned volume names only; this also covers partial stacks
    # where a pod is already absent and `play kube --down --force` cannot
    # discover every remaining PVC-backed volume.
    local volume
    for volume in \
        pulpit-data \
        pulpit-tls \
        pulpit-signing-gnupghome \
        pulpit-signing-scripts \
        pulp-var-lib-containers \
        pulp-var-lib-pgsql \
        pulp-var-lib-pulp \
        pulp-etc \
        pulp-init-admin-password-script; do
        if podman volume exists "${volume}"; then
            podman volume rm --force "${volume}"
        fi
    done

    local image
    while IFS= read -r image; do
        if podman image exists "${image}"; then
            if ! podman image rm "${image}"; then
                echo "Keeping image ${image}: another container still uses it." >&2
            fi
        fi
    done < <(
        awk '$1 == "image:" { gsub(/"/, "", $2); print $2 }' \
            "${SCRIPT_DIR}/redis.yaml" \
            "${SCRIPT_DIR}/pulp.yaml" \
            "${SCRIPT_DIR}/pulpit.yaml" | sort -u
    )

    echo "Reset complete. Podman pods/containers and data volumes were permanently deleted; YAML files and secrets were preserved."
}

if [ "$#" -eq 0 ]; then
    usage
    exit 0
fi

action="$1"
shift

if [ "$#" -ne 0 ]; then
    usage >&2
    exit 1
fi

case "${action}" in
    init) init ;;
    up) up ;;
    down) down ;;
    reset) reset ;;
    help|-h|--help) usage ;;
    *)
        usage >&2
        exit 1
        ;;
esac
