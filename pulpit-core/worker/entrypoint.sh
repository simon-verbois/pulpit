#!/bin/sh
# Runs as root (the container's default user - image doesn't set USER, so
# this step can fix ownership on the two shared volumes before dropping to
# an unprivileged UID for the real process).
#
# UID/GID 700 is not arbitrary: VERIFIED by inspecting a running
# `docker.io/pulp/pulp:stable` container, pulpcore's actual worker process
# (the one that will read GNUPGHOME and execute the signing scripts) runs
# as `pulp`, uid=700 gid=700 - not root. Running pulpit-worker's own
# process under the SAME numeric uid/gid (no shared username needed - the
# kernel only cares about the numbers) is what lets both containers read
# and write the shared `pulpit_signing_gnupghome` /
# `pulpit_signing_scripts` volumes without making either one world-
# readable/writable (task section 15: "avoid world-readable GNUPGHOME").
# See docs/signing.md "Shared volume permissions".
set -eu

GNUPGHOME_DIR="${PULPIT_CORE_SIGNING_GNUPG_HOME:-/var/lib/pulpit-signing/gnupg}"
SCRIPTS_DIR="${PULPIT_CORE_SIGNING_SCRIPTS_DIR:-/var/lib/pulpit-signing/scripts}"

mkdir -p "${GNUPGHOME_DIR}" "${SCRIPTS_DIR}"

# Re-sync the generic signing scripts from the image into the shared volume
# on every start - idempotent, and means an updated pulpit-worker image
# always ships current scripts to the `pulp` container without any manual
# step (only *registering* a brand-new Pulp SigningService needs a manual
# command - app/modules/signing/pulp_bootstrap.py).
cp /opt/pulpit-signing-scripts/*.sh "${SCRIPTS_DIR}/"
chmod 0755 "${SCRIPTS_DIR}"/*.sh

chown -R 700:700 "${GNUPGHOME_DIR}" "${SCRIPTS_DIR}"
chmod 0700 "${GNUPGHOME_DIR}"
chmod 0755 "${SCRIPTS_DIR}"

exec setpriv --reuid=700 --regid=700 --clear-groups -- "$@"
