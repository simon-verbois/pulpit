"""Re-signs an already-downloaded RPM file in place, using the exact same
`rpmsign`/GPG macro invocation as `signing-scripts/sign_rpm_package.sh` -
but called directly by pulpit-worker (which already has the same shared
GNUPGHOME mounted) rather than through Pulp's SigningService script
contract, since this runs against a package pulpit-worker itself downloaded
(see jobs.py's `resign_repository_packages_job`), not one Pulp is signing
at upload time.

Only ever imported by pulpit-worker, and only from inside a job handler
body - see gpg_local.py's docstring for why (pulpit-core's API process has
neither the `rpm`/`rpmsign` binaries nor the GNUPGHOME volume).
"""

import subprocess
from pathlib import Path

from app.modules.signing.gpg_local import validate_fingerprint


class RpmResignError(RuntimeError):
    pass


def resign_rpm_file(path: Path, *, fingerprint: str, gnupg_home: Path) -> None:
    """Embeds a new signature for `fingerprint` into the RPM header at
    `path`, in place - mirrors sign_rpm_package.sh's exact `rpmsign` macro
    set (docs/signing.md "How resigning actually executes")."""
    fingerprint = validate_fingerprint(fingerprint)
    sign_cmd = (
        "%{__gpg} gpg --batch --pinentry-mode loopback --yes --passphrase '' "
        f"--homedir {gnupg_home} --no-armor --digest-algo sha256 -u %{{_gpg_name}} "
        "-sbo %{__signature_filename} --digest-algo sha256 %{__plaintext_filename}"
    )
    args = [
        "rpmsign",
        "--define",
        f"_gpg_path {gnupg_home}",
        "--define",
        f"_gpg_name {fingerprint}",
        "--define",
        "_gpg_digest_algo sha256",
        "--define",
        f"__gpg_sign_cmd {sign_cmd}",
        "--addsign",
        str(path),
    ]
    try:
        proc = subprocess.run(  # noqa: S603 - fixed executable, list args, no shell
            args,
            capture_output=True,
            timeout=120,
            check=False,
            env={"LC_ALL": "C", "PATH": "/usr/bin:/bin"},
        )
    except subprocess.TimeoutExpired as exc:
        raise RpmResignError("rpmsign timed out") from exc
    if proc.returncode != 0:
        raise RpmResignError(f"rpmsign exited {proc.returncode}: {proc.stderr.decode(errors='replace')[-500:]}")
