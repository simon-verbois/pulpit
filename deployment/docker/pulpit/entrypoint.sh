#!/bin/bash
# Multi-process supervisor for the merged `pulpit` image (nginx + pulpit-core
# API + pulpit-worker job queue in one container - docs/adr/0007-merged-
# pulpit-container.md). Runs as root initially (needed to start nginx and to
# prepare the shared GNUPGHOME volume for the worker loop's own uid-700
# drop, exactly as pulpit-core/worker/entrypoint.sh did before the merge),
# then execs each of the three processes as an unprivileged user.
#
# Deliberately no per-process auto-restart (no supervisord/s6): if ANY of
# nginx/pulpit-core/pulpit-worker/the TLS reload watcher dies, this script
# kills the rest and exits, so the whole container restarts - simpler, and
# the same "a crash restarts the whole container" behavior pulpit-worker
# alone already had before the merge. settle_pulpit_data_perms is the one
# exception (see its own comment below): it's expected to self-terminate.
set -euo pipefail

# --- nginx config templating ---------------------------------------------
# Reimplements the official nginx.org Docker image's own
# 15-local-resolvers.envsh + 20-envsubst-on-templates.sh (not available
# here - nginx comes from Debian's own apt package, not that image) -
# VERIFIED reading /etc/resolv.conf is what makes the resolver portable
# across Docker, Podman, and Kubernetes (docs/DEPLOYMENT.md "Known issue
# (fixed): nginx caches Pulp's IP").
NGINX_LOCAL_RESOLVERS=$(awk '/^nameserver/ { addr = $2; if (addr ~ /:/) addr = "[" addr "]"; printf "%s ", addr }' /etc/resolv.conf)
export NGINX_LOCAL_RESOLVERS="${NGINX_LOCAL_RESOLVERS:-127.0.0.11}"
# host:port (or a bare host, defaulting to port 80) of the Pulp instance to
# reverse-proxy to - deliberately just a string this container never
# interprets further, so Pulp can be a sibling container (Compose/Podman
# service name), a Kubernetes Service DNS name, or a real remote host on a
# non-standard port, with no code change (task: "definir dans une var
# l'URL de contact de pulp"). No scheme prefix - this container always
# speaks plain HTTP to Pulp on its own internal network, same trust
# boundary as before the merge.
export PULP_UPSTREAM="${PULP_UPSTREAM:-pulp:80}"
# Fixed, well-known paths both certificate writers (self-signed bootstrap and
# manual upload - app/modules/tls/service.py)
# atomically replaces in place; nginx just always reads these two.
export TLS_CERT_PATH="${PULPIT_CORE_TLS_CERT_DIR:-/var/lib/pulpit-tls}/active/cert.pem"
export TLS_KEY_PATH="${PULPIT_CORE_TLS_CERT_DIR:-/var/lib/pulpit-tls}/active/key.pem"
envsubst '${NGINX_LOCAL_RESOLVERS} ${PULP_UPSTREAM}' \
    < /etc/nginx/pulpit-locations.conf.template \
    > /etc/nginx/pulpit-locations.conf
envsubst '${TLS_CERT_PATH} ${TLS_KEY_PATH}' \
    < /etc/nginx/pulpit.conf.template \
    > /etc/nginx/conf.d/pulpit.conf

# --- pulpit-core's own data dir + database migrations ---------------------
# Embedded SQLite by default (no separate DB container needed - see
# app/core/config/settings.py); PULPIT_CORE_DATABASE_URL can still point at
# a real Postgres instead, in which case this directory (and everything
# below) is simply unused.
#
# BUG FOUND LIVE ("attempt to write a readonly database", then later
# "unable to open database file"): the API/migrations run as the `pulpit`
# user, but the worker loop below runs as uid/gid 700 (GNUPGHOME's own
# owner - see below) - two different identities both needing read/write on
# the SAME SQLite file and its WAL-mode `-wal`/`-shm` sidecar files
# (app/core/database/session.py). VERIFIED, in order of what was actually
# tried and ruled out:
#   - A permissive umask does NOT fix this: SQLite opens its main file with
#     an explicit, non-default mode (0644) rather than the usual 0666 a
#     umask assumes - umask can only ever *remove* permission bits from
#     what a program explicitly requests, never add ones back.
#   - A POSIX default ACL on this directory does NOT fix it either, for the
#     same underlying reason: creating a file with an explicit 0644 mode
#     sets the new file's ACL *mask* to match (r-- for the group class),
#     which caps any default-ACL-granted group permission down to
#     read-only regardless of what the ACL itself grants.
#   - `pulpit` being a *member* of group 700 (see the Dockerfile) is
#     necessary but not sufficient on its own - it makes group permissions
#     actually apply to `pulpit`, but SQLite's own 0644 still has no
#     group-write bit for `fix_pulpit_data_perms` below to have anything to
#     rely on without also chmod'ing explicitly.
#   - The `-wal`/`-shm` files are not created once and left alone: VERIFIED
#     their ownership flips between `pulpit` and `700` across a container's
#     startup (each side's first connection can recreate them) - a single
#     chmod pass immediately after migrations is a race against whichever
#     of uvicorn/the worker loop connects for the first time next. Rather
#     than guess a fixed timing window for when that race is over, the
#     settle loop started near the bottom of this script (once both
#     processes are actually running) polls and re-applies the same chmod
#     fix on a short interval, stopping only once several consecutive
#     passes in a row find nothing left to fix (i.e. it has converged) or a
#     bounded timeout elapses - deterministic on any host regardless of how
#     fast/slow uvicorn and the worker loop each open their first
#     connection. Steady-state operation afterward reuses the same
#     already-open connections and doesn't re-trigger it, so the loop does
#     not need to run for the container's whole lifetime, just long enough
#     to observe both sides' startup connections settle.
mkdir -p /var/lib/pulpit
chown pulpit:700 /var/lib/pulpit
chmod 2770 /var/lib/pulpit
su pulpit -c "cd /app && alembic upgrade head"

# --- TLS material bootstrap -------------------------------------------------
# nginx hard-fails to start at all without something already at
# ${TLS_CERT_PATH}/${TLS_KEY_PATH} - a missing cert file is not a soft
# warning it can start without. Owned pulpit:700 mode 2770 (setgid), same
# convention as /var/lib/pulpit above: the bootstrap script below runs as
# `pulpit`, later regeneration/renewal/manual-upload operations run as
# pulpit-worker (uid/gid 700) - both need write access to this one directory,
# neither needs the other's supplementary group for anything else.
TLS_DIR="${PULPIT_CORE_TLS_CERT_DIR:-/var/lib/pulpit-tls}"
mkdir -p "${TLS_DIR}/active"
chown -R pulpit:700 "${TLS_DIR}"
chmod 2770 "${TLS_DIR}" "${TLS_DIR}/active"
if [ ! -f "${TLS_CERT_PATH}" ] || [ ! -f "${TLS_KEY_PATH}" ]; then
    su pulpit -c "cd /app && python3 -m app.modules.tls.bootstrap_selfsigned"
fi

# No-ops (harmlessly, both here and in pulpit_data_perms_ok/settle_pulpit_data_perms
# below) if PULPIT_CORE_DATABASE_URL was overridden to a real Postgres instead -
# none of these files exist in that case.
fix_pulpit_data_perms() {
    chmod 0660 /var/lib/pulpit/pulpit-core.db 2>/dev/null || true
    chmod 0660 /var/lib/pulpit/pulpit-core.db-wal /var/lib/pulpit/pulpit-core.db-shm 2>/dev/null || true
}
fix_pulpit_data_perms

# True (exit 0) only if every one of the main db file and its WAL-mode
# sidecar files that currently exist already has the expected 0660 mode -
# i.e. nothing for fix_pulpit_data_perms to do right now. A file that
# doesn't exist yet (including all three, on the Postgres-backend no-op
# case above) is treated as fine rather than a reason to keep polling.
pulpit_data_perms_ok() {
    local f
    for f in /var/lib/pulpit/pulpit-core.db /var/lib/pulpit/pulpit-core.db-wal /var/lib/pulpit/pulpit-core.db-shm; do
        [ -e "${f}" ] || continue
        [ "$(stat -c '%a' "${f}" 2>/dev/null)" = "660" ] || return 1
    done
    return 0
}

# Deterministic replacement for the old fixed "sleep 3; fix; sleep 5; fix"
# guesswork: re-applies fix_pulpit_data_perms roughly once a second, for up
# to ${max_wait}s total, and stops early once ${stable_passes_needed}
# consecutive checks in a row already find nothing to fix - i.e. once it has
# actually converged, rather than assuming any particular timing window is
# long enough. Runs in the background (settle_pid below) so it doesn't
# delay starting nginx/uvicorn/the worker loop; self-terminating once
# converged or the timeout elapses, not an ongoing background daemon.
settle_pulpit_data_perms() {
    local max_wait=30
    local interval=1
    local stable_passes_needed=3
    local stable_count=0
    local elapsed=0
    while [ "${elapsed}" -lt "${max_wait}" ]; do
        fix_pulpit_data_perms
        if pulpit_data_perms_ok; then
            stable_count=$((stable_count + 1))
            [ "${stable_count}" -ge "${stable_passes_needed}" ] && return 0
        else
            stable_count=0
        fi
        sleep "${interval}"
        elapsed=$((elapsed + interval))
    done
}

# --- shared signing volume prep (pulpit-worker) ----------------------------
# Identical to the pre-merge pulpit-worker/entrypoint.sh - see
# docs/signing.md "Shared volume permissions" for why uid/gid 700 exactly
# (VERIFIED to match pulpcore-worker's own uid inside the `pulp` image).
GNUPGHOME_DIR="${PULPIT_CORE_SIGNING_GNUPG_HOME:-/var/lib/pulpit-signing/gnupg}"
SCRIPTS_DIR="${PULPIT_CORE_SIGNING_SCRIPTS_DIR:-/var/lib/pulpit-signing/scripts}"
mkdir -p "${GNUPGHOME_DIR}" "${SCRIPTS_DIR}"
cp /opt/pulpit-signing-scripts/*.sh "${SCRIPTS_DIR}/"
chmod 0755 "${SCRIPTS_DIR}"/*.sh
chown -R 700:700 "${GNUPGHOME_DIR}" "${SCRIPTS_DIR}"
chmod 0700 "${GNUPGHOME_DIR}"
chmod 0755 "${SCRIPTS_DIR}"

# --- start all three processes ---------------------------------------------
# set -e was only meant to fail fast on the one-time setup above; from here
# on this script itself decides what a failure means, so `wait -n`'s
# non-zero return must not immediately exit it.
set +e

# Neither pulpit-core (user `pulpit`) nor pulpit-worker (uid/gid 700) has the
# Unix privilege to signal nginx's own root-owned master process to reload a
# newly-installed certificate - so a TLS job just atomically replaces
# ${TLS_CERT_PATH}/${TLS_KEY_PATH} and touches this sentinel file
# (app/modules/tls/service.py's _request_reload), and this root-owned loop
# (same idiom as settle_pulpit_data_perms above, but long-lived for the
# container's whole lifetime instead of self-terminating) does the actual
# reload on its behalf.
watch_tls_reload() {
    local sentinel="${TLS_DIR}/reload-requested"
    while true; do
        if [ -e "${sentinel}" ]; then
            rm -f "${sentinel}"
            nginx -s reload || true
        fi
        sleep 2
    done
}

nginx -g 'daemon off;' &
nginx_pid=$!

su pulpit -c "cd /app && exec uvicorn app.main:app --host 127.0.0.1 --port 8000" &
core_pid=$!

setpriv --reuid=700 --regid=700 --clear-groups -- python3 -m worker.main &
worker_pid=$!

watch_tls_reload &
reload_watch_pid=$!

# Settles the startup race described above (see settle_pulpit_data_perms
# and pulpit_data_perms_ok, defined earlier) - polls/re-fixes until
# converged or its own bounded timeout elapses, rather than a fixed sleep.
settle_pulpit_data_perms &
settle_pid=$!

terminate() {
    kill -TERM "${nginx_pid}" "${core_pid}" "${worker_pid}" "${reload_watch_pid}" "${settle_pid}" 2>/dev/null
}
trap terminate TERM INT

wait -n "${nginx_pid}" "${core_pid}" "${worker_pid}" "${reload_watch_pid}"
exit_code=$?
terminate
wait
exit "${exit_code}"
