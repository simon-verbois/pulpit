#!/bin/bash
# Applies deployment/kube/*.yaml by explicit filename (never a directory
# glob, to avoid picking up 00-secret.example.yaml) and substitutes the
# public-origin placeholder plain YAML can't express.
#
# Usage:
#   ./deployment/kube/deploy.sh up [-n <namespace>]     # deploy (default)
#   ./deployment/kube/deploy.sh down [-n <namespace>]   # tear down
#
# Namespace: pass -n <namespace>, or set KUBE_NAMESPACE. Falls back to
# kubectl's current-context default namespace; must already exist.
#
# Env vars (optional): PULPIT_PUBLIC_ORIGIN (default http://localhost:8080).
# Images are pinned to :latest in pulp.yaml/pulpit.yaml - edit those files
# directly to deploy a specific tag.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${REPO_ROOT}"

PULPIT_PUBLIC_ORIGIN="${PULPIT_PUBLIC_ORIGIN:-http://localhost:8080}"

action="up"
namespace="${KUBE_NAMESPACE:-}"

if [ "${1:-}" != "" ] && [ "${1:-}" != "-n" ]; then
    action="$1"
    shift
fi
while [ "${1:-}" != "" ]; do
    case "$1" in
        -n)
            namespace="${2:-}"
            shift 2
            ;;
        *)
            echo "Usage: $0 [up|down] [-n <namespace>]" >&2
            exit 1
            ;;
    esac
done

kubectl_ns=()
if [ -n "${namespace}" ]; then
    kubectl_ns=(-n "${namespace}")
fi

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "${WORK_DIR}"' EXIT

# Generates 00-secret.yaml from the .example file with real random values.
# Only called when 00-secret.yaml doesn't exist yet - never overwrites one.
generate_secret_file() {
    echo "No deployment/kube/00-secret.yaml found - generating one with fresh secrets..." >&2

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

render_configmap() {
    sed "s#__PULPIT_PUBLIC_ORIGIN__#${PULPIT_PUBLIC_ORIGIN}#g" \
        "${SCRIPT_DIR}/00-configmap.yaml" > "${WORK_DIR}/00-configmap.yaml"
}

up() {
    if [ ! -f "${SCRIPT_DIR}/00-secret.yaml" ]; then
        generate_secret_file
    fi

    render_configmap

    kubectl apply "${kubectl_ns[@]}" -f "${WORK_DIR}/00-configmap.yaml"
    kubectl apply "${kubectl_ns[@]}" -f "${SCRIPT_DIR}/00-secret.yaml"
    kubectl apply "${kubectl_ns[@]}" -f "${SCRIPT_DIR}/redis.yaml"
    kubectl apply "${kubectl_ns[@]}" -f "${SCRIPT_DIR}/pulp.yaml"
    kubectl apply "${kubectl_ns[@]}" -f "${SCRIPT_DIR}/pulpit.yaml"

    echo
    echo "Applied. Once pulpit's Pod is Ready: kubectl ${kubectl_ns[*]} port-forward svc/pulpit 8080:8080"
}

down() {
    if [ ! -f "${SCRIPT_DIR}/00-secret.yaml" ]; then
        echo "Missing deployment/kube/00-secret.yaml - continuing anyway, deleting doesn't need real secret values." >&2
    fi

    render_configmap

    # Also deletes the PersistentVolumeClaims - back up data first if needed.
    kubectl delete "${kubectl_ns[@]}" -f "${SCRIPT_DIR}/pulpit.yaml" --ignore-not-found
    kubectl delete "${kubectl_ns[@]}" -f "${SCRIPT_DIR}/pulp.yaml" --ignore-not-found
    kubectl delete "${kubectl_ns[@]}" -f "${SCRIPT_DIR}/redis.yaml" --ignore-not-found
    if [ -f "${SCRIPT_DIR}/00-secret.yaml" ]; then
        kubectl delete "${kubectl_ns[@]}" -f "${SCRIPT_DIR}/00-secret.yaml" --ignore-not-found
    fi
    kubectl delete "${kubectl_ns[@]}" -f "${WORK_DIR}/00-configmap.yaml" --ignore-not-found
}

case "${action}" in
    up) up ;;
    down) down ;;
    *)
        echo "Usage: $0 [up|down] [-n <namespace>]" >&2
        exit 1
        ;;
esac
