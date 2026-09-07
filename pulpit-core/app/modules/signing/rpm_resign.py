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

import re
import shlex
import subprocess
from pathlib import Path

from app.modules.signing.gpg_local import validate_fingerprint

# rpm expands `%{__gpg_sign_cmd}` and hands the result to a real shell one
# layer down (VERIFIED: this is rpmsign's own --define mechanism, not a
# subprocess.run argv list like every other call in this module) - unlike
# gpg_local.py's _run, which never builds a shell string at all, this macro
# string IS shell-interpreted, so anything interpolated into it needs the
# same validation discipline gpg_local.py already applies to identity name/
# email/fingerprint (_SAFE_NAME_RE/_SAFE_EMAIL_RE/_FINGERPRINT_RE) before it
# reaches gpg. gnupg_home only ever comes from Settings.signing_gnupg_home
# (an operator-set deploy-time Path, never per-request input), but it still
# gets validated here rather than trusted implicitly, and shlex.quote()'d
# into the macro string as a second, belt-and-suspenders layer.
_SAFE_GNUPG_HOME_RE = re.compile(r"^/[\w./-]+$")


def _validate_gnupg_home(gnupg_home: Path) -> str:
    value = str(gnupg_home)
    if not _SAFE_GNUPG_HOME_RE.match(value):
        raise ValueError(
            "gnupg_home must be an absolute path containing only "
            "letters/digits/'.', '/', '_', '-' - got a value that could be "
            "misread by the shell rpmsign's __gpg_sign_cmd macro runs under"
        )
    return value


class RpmResignError(RuntimeError):
    pass


def resign_rpm_file(path: Path, *, fingerprint: str, gnupg_home: Path) -> None:
    """Embeds a new signature for `fingerprint` into the RPM header at
    `path`, in place - mirrors sign_rpm_package.sh's exact `rpmsign` macro
    set (docs/signing.md "How resigning actually executes")."""
    fingerprint = validate_fingerprint(fingerprint)
    safe_gnupg_home = _validate_gnupg_home(gnupg_home)
    quoted_gnupg_home = shlex.quote(safe_gnupg_home)
    sign_cmd = (
        "%{__gpg} gpg --batch --pinentry-mode loopback --yes --passphrase '' "
        f"--homedir {quoted_gnupg_home} --no-armor --digest-algo sha256 -u %{{_gpg_name}} "
        "-sbo %{__signature_filename} --digest-algo sha256 %{__plaintext_filename}"
    )
    args = [
        "rpmsign",
        "--define",
        f"_gpg_path {safe_gnupg_home}",
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
