#!/usr/bin/env bash
# Generic repository metadata (repomd.xml) signing script, registered with
# Pulp as a `core.AsciiArmoredDetachedSigningService` (VERIFIED contract -
# docs/signing.md, pulpcore's own documented example script). Runs INSIDE
# the `pulp` worker process/container when pulpcore calls
# SigningService.sign(filename) - see docs/signing.md "How signing actually
# executes" for the full data flow.
#
# Contract (fixed by pulpcore, not by this project):
#   - argv[1] is the file to sign.
#   - PULP_SIGNING_KEY_FINGERPRINT is set by pulpcore from the
#     SigningService's own bound fingerprint (docs/signing.md).
#   - On success: print {"file": "<path>", "signature": "<path>"} to stdout
#     and exit 0. On failure: exit non-zero (pulpcore surfaces stderr).
set -euo pipefail

FILE_PATH="$1"
SIGNATURE_PATH="${FILE_PATH}.asc"
FINGERPRINT="${PULP_SIGNING_KEY_FINGERPRINT:?PULP_SIGNING_KEY_FINGERPRINT not set by Pulp}"
GNUPGHOME="${PULPIT_SIGNING_GNUPGHOME:-/var/lib/pulpit-signing/gnupg}"

gpg --quiet --batch --pinentry-mode loopback --yes --passphrase "" \
    --homedir "${GNUPGHOME}" \
    --detach-sign --default-key "${FINGERPRINT}" \
    --armor --output "${SIGNATURE_PATH}" "${FILE_PATH}"

printf '{"file": "%s", "signature": "%s"}\n' "${FILE_PATH}" "${SIGNATURE_PATH}"
