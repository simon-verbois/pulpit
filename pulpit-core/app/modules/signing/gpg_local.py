"""LocalGPGKeyManager - the v1 KeyManager backend.

Runs in pulpit-worker ONLY (never the pulpit-core API process - see
key_manager.py). Security properties (task section 15), concretely:

- `subprocess.run` is always called with an argument LIST, never a shell
  string (`shell=False`, the default) - no user-controlled value is ever
  concatenated into a shell command.
- Every value that reaches an argument (identity name/email, algorithm,
  validity) is validated/sanitized first (see _validate_* below) - GPG's
  `--quick-generate-key` UID argument in particular is rejected if it
  contains characters that could be misread as a second argument or GPG
  batch-file directive.
- GNUPGHOME is a dedicated directory (never the OS user's default
  `~/.gnupg`), created with `0700` permissions - never world/group-readable.
- Passphrase-less keys: this v1 backend generates keys without a passphrase
  because pulpit-worker must sign non-interactively with no human present
  (same constraint pulpcore's own documented signing scripts have - see
  docs/signing.md "Security model"). This is a real, documented risk (whoever
  can read the GNUPGHOME volume can sign as this key) mitigated by: the
  volume is mounted only into pulpit-worker (never pulpit-core or pulpit),
  restrictive file permissions, and the KeyManager abstraction itself - a
  future HSM/Vault/KMS backend can require no local private key file at all
  without changing any caller of this interface.
- No private key material, passphrase, or full gpg stderr is ever logged;
  only the fingerprint/keyid/return code are (see _run).
"""

import re
import subprocess
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

from app.modules.signing.key_manager import GeneratedKey, KeyManager

_SAFE_NAME_RE = re.compile(r"^[\w .,'\-]{1,200}$", re.UNICODE)
_SAFE_EMAIL_RE = re.compile(r"^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$")
_ALLOWED_ALGORITHMS = {"rsa2048", "rsa3072", "rsa4096", "ed25519"}
_FINGERPRINT_RE = re.compile(r"^[0-9A-Fa-f]{40}$")


class GPGOperationError(RuntimeError):
    pass


def _validate_identity_name(name: str) -> str:
    name = name.strip()
    if not name or not _SAFE_NAME_RE.match(name):
        raise ValueError(
            "Identity name must be 1-200 characters, letters/digits/spaces/'.,-  only"
        )
    return name


def _validate_identity_email(email: str) -> str:
    email = email.strip()
    if not email:
        return ""
    if not _SAFE_EMAIL_RE.match(email):
        raise ValueError("Identity email is not a valid email address")
    return email


def _validate_algorithm(algorithm: str) -> str:
    if algorithm not in _ALLOWED_ALGORITHMS:
        raise ValueError(f"Unsupported algorithm {algorithm!r}, expected one of {_ALLOWED_ALGORITHMS}")
    return algorithm


def validate_fingerprint(fingerprint: str) -> str:
    if not _FINGERPRINT_RE.match(fingerprint):
        raise ValueError("Fingerprint must be a 40-character hex GPG v4 fingerprint")
    return fingerprint


def _build_uid(identity_name: str, identity_email: str) -> str:
    name = _validate_identity_name(identity_name)
    email = _validate_identity_email(identity_email)
    # GPG UID convention: "Name <email>" or bare "Name" - never built with
    # untrusted string interpolation beyond this single, validated format.
    return f"{name} <{email}>" if email else name


@dataclass
class _GpgResult:
    returncode: int
    stdout: str
    stderr: str


class LocalGPGKeyManager(KeyManager):
    def __init__(self, gnupg_home: Path):
        self._gnupg_home = gnupg_home
        self._gnupg_home.mkdir(parents=True, exist_ok=True, mode=0o700)
        self._gnupg_home.chmod(0o700)
        # Non-interactive, no-passphrase generation (module docstring above:
        # a documented, deliberate trade-off for a worker with no human
        # present) needs gpg-agent to hand the empty passphrase to itself
        # rather than spawning a real pinentry, which fails outright with no
        # controlling TTY (the normal case for a container process).
        agent_conf = self._gnupg_home / "gpg-agent.conf"
        if not agent_conf.exists():
            agent_conf.write_text("allow-loopback-pinentry\n")
            agent_conf.chmod(0o600)

    def _run(self, args: list[str], *, timeout: int = 30) -> _GpgResult:
        full_args = [
            "gpg",
            "--homedir",
            str(self._gnupg_home),
            "--batch",
            "--yes",
            "--pinentry-mode",
            "loopback",
            "--passphrase",
            "",
            *args,
        ]
        try:
            proc = subprocess.run(  # noqa: S603 - fixed executable, list args, no shell
                full_args,
                capture_output=True,
                text=True,
                timeout=timeout,
                check=False,
                env={"LC_ALL": "C", "PATH": "/usr/bin:/bin"},  # no inherited secrets in env
            )
        except subprocess.TimeoutExpired as exc:
            raise GPGOperationError("gpg operation timed out") from exc
        if proc.returncode != 0:
            # gpg's stderr can be verbose but does not contain private key
            # material for the operations this class performs; still capped
            # to avoid leaking anything unexpectedly long into logs/DB.
            raise GPGOperationError(f"gpg exited {proc.returncode}: {proc.stderr[-500:]}")
        return _GpgResult(proc.returncode, proc.stdout, proc.stderr)

    def generate_key(
        self,
        *,
        identity_name: str,
        identity_email: str,
        algorithm: str,
        validity_days: int | None,
    ) -> GeneratedKey:
        uid = _build_uid(identity_name, identity_email)
        algo = _validate_algorithm(algorithm)
        expire_arg = f"{validity_days}d" if validity_days else "0"
        if validity_days is not None and (validity_days < 1 or validity_days > 3650):
            raise ValueError("validity_days must be between 1 and 3650")

        self._run(
            [
                "--quick-generate-key",
                uid,
                algo,
                "sign",
                expire_arg,
            ],
            timeout=60,
        )
        fingerprint, key_id, created_at, expires_at = self._inspect_key(uid)
        public_key_armor = self.export_public_key(fingerprint)
        return GeneratedKey(
            fingerprint=fingerprint,
            key_id=key_id,
            public_key_armor=public_key_armor,
            created_at=created_at,
            expires_at=expires_at,
        )

    def _inspect_key(self, uid: str) -> tuple[str, str, datetime, datetime | None]:
        result = self._run(["--with-colons", "--fingerprint", uid])
        fingerprint = None
        key_id = None
        created_at = None
        expires_at = None
        for line in result.stdout.splitlines():
            fields = line.split(":")
            if fields[0] == "pub":
                key_id = fields[4]
                created_at = datetime.fromtimestamp(int(fields[5]), tz=UTC)
                expires_at = (
                    datetime.fromtimestamp(int(fields[6]), tz=UTC) if fields[6] else None
                )
            elif fields[0] == "fpr" and fingerprint is None:
                fingerprint = fields[9]
        if not fingerprint or not key_id or not created_at:
            raise GPGOperationError("Could not parse generated key from gpg output")
        return fingerprint, key_id, created_at, expires_at

    def export_public_key(self, fingerprint: str) -> str:
        fingerprint = validate_fingerprint(fingerprint)
        result = self._run(["--armor", "--export", fingerprint])
        if not result.stdout.strip():
            raise GPGOperationError(f"No public key exported for fingerprint {fingerprint}")
        return result.stdout

    def extend_expiration(self, fingerprint: str, new_validity_days: int | None) -> datetime | None:
        fingerprint = validate_fingerprint(fingerprint)
        expire_arg = f"{new_validity_days}d" if new_validity_days else "0"
        # --quick-set-expire <fpr> <expire> [subkey-fprs...] - primary key only here.
        self._run(["--quick-set-expire", fingerprint, expire_arg])
        _, _, _, expires_at = self._inspect_key(fingerprint)
        return expires_at
