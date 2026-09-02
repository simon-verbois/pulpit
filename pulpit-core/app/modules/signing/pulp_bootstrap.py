"""Bridges the gap between "pulpit-core decided a Pulp SigningService needs
to exist" and the fact that Pulp only allows creating one via a management
command run on the Pulp server itself (VERIFIED - docs/signing.md,
docs/PULP_API.md).

Design (see docs/adr/0006-pulpit-core-backend.md and docs/signing.md
"Automating the manual Pulp step"): pulpit-core always computes the exact
command AND its argument-list form. `signing.check_pulp_bootstrap`
(jobs.py) first tries running it automatically through whatever
`PulpCommandExecutor` is configured (app/adapters/pulp/executor.py -
optional, e.g. Docker exec for this project's Compose reference
deployment); if none is configured, or it fails, the row is left
PENDING_MANUAL_SETUP exactly as before and the GUI/API keep surfacing the
printed command for an administrator to run themselves. Automating this is
strictly additive - a deployment that can't or doesn't want to grant
command-execution access loses nothing.
"""

import shlex

from app.adapters.pulp import PulpClient
from app.adapters.pulp.executor import CommandResult, ExecutorUnavailableError, PulpCommandExecutor
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
    `pulpcore-manager` executable itself - `PulpCommandExecutor.
    run_pulpcore_manager` prepends that). Field names/flags VERIFIED against
    pulpcore's/pulp_rpm's own management command and docs (docs/signing.md).

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
    `docker compose exec pulp <command>`) if no executor is configured or
    automatic registration failed - every argument `shlex.quote`d so a
    copy-pasted malicious-looking name can't inject a second command."""
    args = build_bootstrap_args(
        purpose=purpose,
        service_name=service_name,
        fingerprint=fingerprint,
        scripts_dir=scripts_dir,
        gnupg_home=gnupg_home,
    )
    return " ".join(shlex.quote(a) for a in ["pulpcore-manager", *args])


def attempt_automatic_registration(
    executor: PulpCommandExecutor, row: SigningPulpService, *, scripts_dir: str
) -> CommandResult | None:
    """Tries to run `row`'s bootstrap command through `executor`. Returns
    None (never raises) if the executor itself is unreachable/unconfigured -
    callers must treat that exactly like "no executor configured" and fall
    back to the manual command; a `CommandResult` with `ok=False` (the
    executor worked but the command itself failed) is returned normally so
    the caller can decide whether to surface that error."""
    from app.core.config import get_settings

    args = build_bootstrap_args(
        purpose=row.purpose,
        service_name=row.name,
        fingerprint=row.fingerprint,
        scripts_dir=scripts_dir,
        gnupg_home=str(get_settings().signing_gnupg_home),
    )
    try:
        return executor.run_pulpcore_manager(args, timeout=120)
    except ExecutorUnavailableError:
        return None


def refresh_pulp_service_status(pulp: PulpClient, row: SigningPulpService) -> bool:
    """Checks whether `row.name` now exists in Pulp's signing-services list
    (i.e. the service was registered, automatically or by an administrator)
    and updates `row` in place. Returns True if the row transitioned to
    ACTIVE this call."""
    from app.modules.signing.models import PulpServiceStatus

    if row.status != PulpServiceStatus.PENDING_MANUAL_SETUP:
        return False
    existing = pulp.get_signing_service_by_name(row.name)
    if existing is None:
        return False
    row.pulp_href = existing["pulp_href"]
    row.status = PulpServiceStatus.ACTIVE
    return True
