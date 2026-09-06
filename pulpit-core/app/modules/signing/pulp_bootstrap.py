"""Bridges the gap between "pulpit-core decided a Pulp SigningService needs
to exist" and the fact that Pulp only allows creating one via a management
command run on the Pulp server itself (VERIFIED - docs/signing.md,
docs/PULP_API.md).

Design (see docs/adr/0006-pulpit-core-backend.md, docs/adr/0008-colocated-
signing-reconciler.md, and docs/signing.md "Automating the manual Pulp
step"): pulpit-core always computes the exact command, both as an
argument-list form (for the manifest below) and as its shell-quoted display
string (for the manual fallback). Registration itself is never run from
here - `signing.check_pulp_bootstrap` (jobs.py) writes the desired-state
manifest a small reconciler baked into a derived Pulp image
(deployment/docker/pulp/pulpit-signing-reconciler) reads and acts on from
*inside* the `pulp` container. If that reconciler isn't present (a
deployment running vanilla `pulp/pulp:stable`), the row is left
PENDING_MANUAL_SETUP exactly as before and the GUI/API keep surfacing the
printed command for an administrator to run themselves - automating this is
strictly additive, never a hard requirement.
"""

import json
import os
import shlex
from pathlib import Path

from app.adapters.pulp import PulpClient
from app.modules.signing.models import PulpServicePurpose, SigningPulpService

_SCRIPT_FILENAMES = {
    PulpServicePurpose.PACKAGE: "sign_rpm_package.sh",
    PulpServicePurpose.METADATA: "sign_metadata.sh",
}

_SIGNING_SERVICE_CLASS = {
    PulpServicePurpose.PACKAGE: "rpm:RpmPackageSigningService",
    PulpServicePurpose.METADATA: "core:AsciiArmoredDetachedSigningService",
}


def build_bootstrap_args(
    *, purpose: PulpServicePurpose, service_name: str, fingerprint: str, scripts_dir: str, gnupg_home: str
) -> list[str]:
    """The `add-signing-service` subcommand and its arguments (excluding the
    `pulpcore-manager` executable itself). Field names/flags VERIFIED
    against pulpcore's/pulp_rpm's own management command and docs
    (docs/signing.md).

    BUG FOUND LIVE: `--home` is not optional here - without it,
    `add-signing-service` looks for the key in the invoking process's own
    default `~/.gnupg` (empty, since it's a fresh root shell inside the
    `pulp` container) and fails with "gpg: error reading key: No public
    key", never the shared GNUPGHOME volume this project actually generated
    the key into."""
    script_path = f"{scripts_dir.rstrip('/')}/{_SCRIPT_FILENAMES[purpose]}"
    return [
        "add-signing-service",
        service_name,
        script_path,
        fingerprint,
        "--class",
        _SIGNING_SERVICE_CLASS[purpose],
        "--home",
        gnupg_home,
    ]


def build_bootstrap_command(
    *, purpose: PulpServicePurpose, service_name: str, fingerprint: str, scripts_dir: str, gnupg_home: str
) -> str:
    """The exact `pulpcore-manager add-signing-service` invocation an
    administrator can run **inside the `pulp` container** (e.g. via
    `docker compose exec pulp <command>`) if the colocated reconciler isn't
    present or hasn't registered it yet - every argument `shlex.quote`d so a
    copy-pasted malicious-looking name can't inject a second command."""
    args = build_bootstrap_args(
        purpose=purpose,
        service_name=service_name,
        fingerprint=fingerprint,
        scripts_dir=scripts_dir,
        gnupg_home=gnupg_home,
    )
    return " ".join(shlex.quote(a) for a in ["pulpcore-manager", *args])


def build_manifest_entry(
    *, purpose: PulpServicePurpose, service_name: str, fingerprint: str, scripts_dir: str, gnupg_home: str
) -> dict[str, str]:
    """One entry of the desired-state manifest the colocated reconciler
    (deployment/docker/pulp/pulpit-signing-reconciler) polls from inside the
    `pulp` container - the same 5 fields `build_bootstrap_args` turns into
    CLI arguments, just as a JSON object instead of an argv list."""
    script_path = f"{scripts_dir.rstrip('/')}/{_SCRIPT_FILENAMES[purpose]}"
    return {
        "name": service_name,
        "script": script_path,
        "fingerprint": fingerprint,
        "class": _SIGNING_SERVICE_CLASS[purpose],
        "home": gnupg_home,
    }


def write_signing_services_manifest(entries: list[dict[str, str]], *, manifest_path: str) -> None:
    """Atomically replaces the manifest file the reconciler polls - writes to
    a temp file in the same directory, then `os.replace` (atomic on a single
    filesystem, which a bind-mounted/named volume always is here) so the
    reconciler never observes a half-written file. A full replace each call,
    not an incremental patch - the caller always passes every currently
    pending entry, so a row that just became ACTIVE naturally drops out on
    the next write without any explicit removal step."""
    path = Path(manifest_path)
    tmp_path = path.with_name(f"{path.name}.tmp")
    tmp_path.write_text(json.dumps(entries, indent=2))
    os.replace(tmp_path, path)


def refresh_pulp_service_status(pulp: PulpClient, row: SigningPulpService) -> bool:
    """Checks whether `row.name` now exists in Pulp's signing-services list
    (i.e. the service was registered, by the colocated reconciler or by an
    administrator) and updates `row` in place. Returns True if the row
    transitioned to ACTIVE this call."""
    from app.modules.signing.models import PulpServiceStatus

    if row.status != PulpServiceStatus.PENDING_MANUAL_SETUP:
        return False
    existing = pulp.get_signing_service_by_name(row.name)
    if existing is None:
        return False
    row.pulp_href = existing["pulp_href"]
    row.status = PulpServiceStatus.ACTIVE
    return True
