"""Background generation and renewal jobs for the TLS module."""

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.jobs.registry import job_registry
from app.modules.tls import service
from app.modules.tls.models import TlsCertSource
from app.modules.tls.selfsigned import generate_selfsigned

MODULE = "tls"


def generate_selfsigned_job(db: Session, payload: dict) -> dict:
    settings = get_settings()
    generated = generate_selfsigned(
        common_name=settings.tls_selfsigned_common_name,
        validity_days=settings.tls_selfsigned_validity_days,
    )
    cert = service.install_certificate(
        db,
        source=TlsCertSource.SELF_SIGNED,
        cert_pem=generated.cert_pem,
        key_pem=generated.key_pem,
        subject=generated.subject,
        fingerprint_sha256=generated.fingerprint_sha256,
        not_before=generated.not_before,
        not_after=generated.not_after,
        triggered_by=payload.get("triggered_by", "manual"),
        notes=payload.get("notes", ""),
    )
    return {"certificate_id": str(cert.id), "fingerprint": cert.fingerprint_sha256}


def renewal_check_job(db: Session, payload: dict) -> dict:
    """Renew the self-signed fallback near expiry; manual certificates only warn."""
    cert = service.get_active_certificate(db)
    if cert is None:
        return {"action": "none"}

    if cert.source == TlsCertSource.SELF_SIGNED:
        if service.days_until(cert.not_after) > get_settings().tls_warn_days:
            return {"action": "none"}
        result = generate_selfsigned_job(
            db, {"triggered_by": "schedule", "notes": "Auto-renewed before expiry."}
        )
        return {"action": "renewed_selfsigned", **result}

    return {"action": "none"}


def register() -> None:
    job_registry.register("tls.generate_selfsigned", generate_selfsigned_job)
    job_registry.register("tls.renewal_check", renewal_check_job)
