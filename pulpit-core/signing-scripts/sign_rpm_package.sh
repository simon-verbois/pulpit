#!/usr/bin/env bash
# Generic RPM package signing script, registered with Pulp as an
# `rpm:RpmPackageSigningService` (task section 8; class name VERIFIED
# against pulp_rpm's add-signing-services docs - docs/signing.md).
#
# Output contract VERIFIED by reading the installed pulp_rpm source directly
# off a live container (`pulp_rpm/app/models/content.py`,
# `RpmPackageSigningService.validate()`/`.sign()` - docs/signing.md): must
# print `{"rpm_package": "<path>"}` to stdout, and the fingerprint always
# arrives via PULP_SIGNING_KEY_FINGERPRINT on every call (pulp_rpm explicitly
# nulls out the SigningService's own bound fingerprint and requires the
# caller - Pulp itself, from the repository's package_signing_fingerprint -
# to supply one), never the signing service's own bound key. `validate()`
# actually builds and rpmsign-verifies a real throwaway RPM, which is how
# the "rpmsign prints its own progress line to stdout" bug below was caught
# live rather than guessed.
#
# Embeds an RPM v4 signature into the package header in place, using
# `rpmsign`/`rpm --addsign` machinery driven entirely through rpm's own gpg
# macros (never a hand-rolled binary edit of the RPM - task section 8: Pulp,
# not this script, remains authoritative for the resulting artifact/content
# unit once Pulp reads the signed file back).
set -euo pipefail

FILE_PATH="$1"
FINGERPRINT="${PULP_SIGNING_KEY_FINGERPRINT:?PULP_SIGNING_KEY_FINGERPRINT not set by Pulp}"
GNUPGHOME="${PULPIT_SIGNING_GNUPGHOME:-/var/lib/pulpit-signing/gnupg}"

## VERIFIED against a live pulpcore/pulp_rpm instance (docs/signing.md):
## `rpmsign`/`rpm --addsign` prints its own "<file>:" progress line to
## stdout - pulpcore's SigningService.sign() treats the ENTIRE stdout as
## the JSON payload (json.loads(completed_process.stdout)), so that extra
## line must never reach stdout or every signing call fails with "The
## signing service script did not return valid JSON!". Redirect it away;
## keep stderr visible (pulpcore surfaces it verbatim on real failures).
rpmsign \
    --define "_gpg_path ${GNUPGHOME}" \
    --define "_gpg_name ${FINGERPRINT}" \
    --define "_gpg_digest_algo sha256" \
    --define "__gpg_sign_cmd %{__gpg} gpg --batch --pinentry-mode loopback --yes --passphrase '' --homedir ${GNUPGHOME} --no-armor --digest-algo sha256 -u %{_gpg_name} -sbo %{__signature_filename} --digest-algo sha256 %{__plaintext_filename}" \
    --addsign "${FILE_PATH}" > /dev/null

printf '{"file": "%s", "rpm_package": "%s"}\n' "${FILE_PATH}" "${FILE_PATH}"
