#!/bin/bash
# Applies deployment/kube/*.yaml by explicit filename - NEVER
# `kubectl apply -f deployment/kube/` as a directory glob, which would also
# pick up 00-secret.example.yaml (literal "REPLACE_ME" placeholder values)
# if it were ever left sitting in this directory. Also substitutes the
# placeholders YAML itself can't express (image tags, the public origin -
# see pulp.yaml/pulpit.yaml/00-configmap.yaml's own comments), same sed-
# templating approach deployment/podman/deploy.sh uses for its own one
# placeholder. `up` also auto-generates 00-secret.yaml (from
# 00-secret.example.yaml, with real random values) the first time it's
# missing - see generate_secret_file() below - so a first deploy needs no
# manual secret-editing step; delete the file and re-run to get a fresh set
# instead.
#
# Usage:
#   ./deployment/kube/deploy.sh up [-n <namespace>]     # deploy (default if no argument given)
#   ./deployment/kube/deploy.sh down [-n <namespace>]   # tear down
#
# Namespace: pass -n <namespace>, or set KUBE_NAMESPACE - matching
# deployment/kube/README.md's own `kubectl apply -n <your-namespace>`
# convention. Falls back to kubectl's own current-context default
# namespace if neither is given. The namespace itself must already exist
# (this script doesn't create one, same as the README's previous
# one-liner).
#
# Image tags / public origin: set PULP_PULPIT_IMAGE_TAG, PULPIT_IMAGE_TAG
# (both default "latest") and PULPIT_PUBLIC_ORIGIN (defaults
# http://localhost:8080) - same env var names/defaults Compose's
# .env.example uses, for consistency across all three deployment targets.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${REPO_ROOT}"

PULP_PULPIT_IMAGE_TAG="${PULP_PULPIT_IMAGE_TAG:-latest}"
PULPIT_IMAGE_TAG="${PULPIT_IMAGE_TAG:-latest}"
PULPIT_PUBLIC_ORIGIN="${PULPIT_PUBLIC_ORIGIN:-http://localhost:8080}"

action="up"
namespace="${KUBE_NAMESPACE:-}"

# Accept the action as the first positional argument (default "up"), then
# an optional -n <namespace> anywhere after it.
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

# Generates deployment/kube/00-secret.yaml from the .example file with real
# random values instead of making the operator hand-edit REPLACE_ME - same
# three values Compose's .env.example/Podman's 00-secret.example.yaml need
# (PULP_SECRET_KEY, PULPIT_CORE_SECRET_KEY, PULP_ADMIN_PASSWORD), generated
# the same way (openssl rand -hex 32; a Fernet key is just base64(32 random
# bytes) with a urlsafe alphabet, which is exactly what
# `openssl rand -base64 32 | tr '+/' '-_'` produces, no python dependency
# needed). Only ever called when 00-secret.yaml doesn't exist yet - never
# overwrites one you already have.
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

render() {
    sed \
        -e "s#__PULP_PULPIT_IMAGE_TAG__#${PULP_PULPIT_IMAGE_TAG}#g" \
        -e "s#__PULPIT_IMAGE_TAG__#${PULPIT_IMAGE_TAG}#g" \
        -e "s#__PULPIT_PUBLIC_ORIGIN__#${PULPIT_PUBLIC_ORIGIN}#g" \
        "${SCRIPT_DIR}/$1" > "${WORK_DIR}/$1"
}

render_all() {
    render 00-configmap.yaml
    render pulp.yaml
    render pulpit.yaml
}

up() {
    if [ ! -f "${SCRIPT_DIR}/00-secret.yaml" ]; then
        generate_secret_file
    fi

    render_all

    # Explicit filename list, never a directory glob - the whole point of
    # this script (see the header comment above).
    kubectl apply "${kubectl_ns[@]}" -f "${WORK_DIR}/00-configmap.yaml"
    kubectl apply "${kubectl_ns[@]}" -f "${SCRIPT_DIR}/00-secret.yaml"
    kubectl apply "${kubectl_ns[@]}" -f "${SCRIPT_DIR}/redis.yaml"
    kubectl apply "${kubectl_ns[@]}" -f "${WORK_DIR}/pulp.yaml"
    kubectl apply "${kubectl_ns[@]}" -f "${WORK_DIR}/pulpit.yaml"

    echo
    echo "Applied. Once pulpit's Pod is Ready: kubectl ${kubectl_ns[*]} port-forward svc/pulpit 8080:8080"
}

down() {
    if [ ! -f "${SCRIPT_DIR}/00-secret.yaml" ]; then
        echo "Missing deployment/kube/00-secret.yaml - nothing to render for pulp.yaml/pulpit.yaml's placeholders, but deleting doesn't need real secret values anyway; continuing." >&2
    fi

    render_all

    # Reverse order of `up`. Note this also deletes the PersistentVolumeClaims
    # declared inline in pulp.yaml/pulpit.yaml (unlike Podman's named volumes,
    # which `podman play kube --down` leaves in place) - back up data first if
    # you need to keep it.
    kubectl delete "${kubectl_ns[@]}" -f "${WORK_DIR}/pulpit.yaml" --ignore-not-found
    kubectl delete "${kubectl_ns[@]}" -f "${WORK_DIR}/pulp.yaml" --ignore-not-found
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
