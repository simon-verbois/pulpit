"""tls module business logic: reading the active certificate/history, and
the filesystem side of "install a new certificate" (atomic write + request an
nginx reload). Anything that talks to an external CA is a job (jobs.py),
never called synchronously from a request handler (same "long-running work
must be asynchronous" rule as signing/service.py)."""

from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.modules.tls.models import TlsCertificate, TlsCertificateHistory, TlsCertSource


def get_active_certificate(db: Session) -> TlsCertificate | None:
    return (
        db.execute(select(TlsCertificate).order_by(TlsCertificate.created_at.desc()))
        .scalars()
        .first()
    )


def list_history(db: Session, limit: int = 50) -> list[TlsCertificateHistory]:
    return list(
        db.execute(
            select(TlsCertificateHistory).order_by(TlsCertificateHistory.created_at.desc()).limit(limit)
        ).scalars()
    )


def days_until(dt: datetime) -> int:
    return (dt - datetime.now(UTC)).days


def install_certificate(
    db: Session,
    *,
    source: TlsCertSource,
    cert_pem: str,
    key_pem: str,
    subject: str,
    fingerprint_sha256: str,
    not_before: datetime,
    not_after: datetime,
    triggered_by: str,
    event: str = "installed",
    notes: str = "",
    freeipa_request_id: str | None = None,
    freeipa_principal: str | None = None,
    request_reload: bool = True,
) -> TlsCertificate:
    """Atomically replaces the on-disk cert/key, records the new active row
    plus a history entry, and (unless this is the very first boot, before
    nginx has even started) requests nginx pick it up. The one write path
    every source - self-signed, manual, FreeIPA - goes through."""
    _write_active_files(cert_pem, key_pem)

    row = TlsCertificate(
        source=source,
        subject=subject,
        fingerprint_sha256=fingerprint_sha256,
        not_before=not_before,
        not_after=not_after,
        freeipa_request_id=freeipa_request_id,
        freeipa_principal=freeipa_principal,
    )
    db.add(row)
    db.add(
        TlsCertificateHistory(
            event=event,
            source=source,
            fingerprint_sha256=fingerprint_sha256,
            not_after=not_after,
            triggered_by=triggered_by,
            notes=notes,
        )
    )
    db.flush()
    if request_reload:
        _request_reload()
    return row


def _write_active_files(cert_pem: str, key_pem: str) -> None:
    active_dir = get_settings().tls_cert_dir / "active"
    active_dir.mkdir(parents=True, exist_ok=True)
    _atomic_write(active_dir / "cert.pem", cert_pem, mode=0o644)
    _atomic_write(active_dir / "key.pem", key_pem, mode=0o600)


def _atomic_write(path: Path, content: str, *, mode: int) -> None:
    # Same directory, same filesystem - os.replace()/Path.replace() is
    # atomic there, so nginx (reading these paths directly) never observes a
    # half-written file, only the complete old one or the complete new one.
    tmp_path = path.with_name(path.name + ".tmp")
    tmp_path.write_text(content)
    tmp_path.chmod(mode)
    tmp_path.replace(path)


def _request_reload() -> None:
    """Touches the sentinel file deployment/docker/pulpit/entrypoint.sh's
    root-owned watch loop polls for. Neither pulpit-core nor pulpit-worker
    has the Unix privilege to signal nginx's root-owned master process
    directly - see that script's watch_tls_reload."""
    tls_dir = get_settings().tls_cert_dir
    tls_dir.mkdir(parents=True, exist_ok=True)
    (tls_dir / "reload-requested").touch()
