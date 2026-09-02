#!/bin/sh
# Runs as a Compose `post_start` hook on the `pulp` service (see compose.yml)
# every time the container starts. It never touches the container's own
# entrypoint/init sequence (s6-overlay) - it only runs an extra command
# after that sequence has brought the container up.
#
# Behavior (docs/DEPLOYMENT.md):
#   - PULP_ADMIN_PASSWORD unset/empty -> do nothing, leave the "admin"
#     account (and whatever password Pulp itself generated for it) untouched.
#   - PULP_ADMIN_PASSWORD set -> wait for Pulp's own init to finish creating
#     the "admin" user, then set its password to that value. Idempotent -
#     safe to run on every start.
set -eu

if [ -z "${PULP_ADMIN_PASSWORD:-}" ]; then
  echo "pulpit-init-admin-password: PULP_ADMIN_PASSWORD not set, leaving the admin account untouched."
  exit 0
fi

echo "pulpit-init-admin-password: PULP_ADMIN_PASSWORD is set, waiting for Pulp to finish initializing..."

attempt=0
max_attempts=30
until pulpcore-manager reset-admin-password --password "$PULP_ADMIN_PASSWORD" >/tmp/pulpit-init-admin-password.log 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "pulpit-init-admin-password: giving up after $max_attempts attempts. Last output:" >&2
    cat /tmp/pulpit-init-admin-password.log >&2
    echo "pulpit-init-admin-password: you can retry manually with 'make pulp-reset-admin'." >&2
    exit 1
  fi
  sleep 5
done

echo "pulpit-init-admin-password: admin password set from PULP_ADMIN_PASSWORD."
