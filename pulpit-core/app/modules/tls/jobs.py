"""Job handlers for the tls module, registered under the "tls.*" namespace
(app/core/jobs/registry.py). Only ever executed by pulpit-worker's loop
(worker/main.py) - the API process only enqueues rows into the `jobs` table
(app/modules/tls/routes/*.py) and polls their status. The one exception is
manual certificate upload (routes/manual.py) and the FreeIPA setup wizard
(routes/freeipa.py), both applied synchronously in their own route handlers -
see their own docstrings for why.
"""

import base64
import logging

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from sqlalchemy.orm import Session

from app.adapters.freeipa import FreeIPAAdapterError, FreeIPAClient
from app.core.config import get_settings
from app.core.crypto import decrypt_secret
from app.core.jobs.registry import job_registry
from app.modules.tls import freeipa_settings, service
from app.modules.tls.csr import generate_csr
from app.modules.tls.models import TlsCertSource
from app.modules.tls.selfsigned import generate_selfsigned

MODULE = "tls"
logger = logging.getLogger(__name__)


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


def _freeipa_client(row) -> FreeIPAClient:
    return FreeIPAClient(
        row.base_url,
        verify_tls=row.verify_tls,
        timeout=get_settings().ipa_request_timeout_seconds,
    )


def freeipa_test_connection_job(db: Session, _payload: dict) -> dict:
    row = freeipa_settings.get_settings_row(db)
    if not row.base_url or not row.service_username or row.service_password_encrypted is None:
        return {"success": False, "error": "FreeIPA settings are incomplete."}
    try:
        _freeipa_client(row).login(row.service_username, decrypt_secret(row.service_password_encrypted))
        return {"success": True}
    except FreeIPAAdapterError as exc:
        return {"success": False, "error": str(exc)}


def _freeipa_request_or_renew(db: Session, payload: dict, *, event: str) -> dict:
    """Shared by the manual "Request certificate" action (first issuance)
    and the scheduled renewal heartbeat - FreeIPA has no distinct "renew"
    RPC of its own here, re-requesting a fresh cert_request with a new CSR
    is how both are done."""
    row = freeipa_settings.get_settings_row(db)
    if not row.enabled:
        raise ValueError("The FreeIPA provider is not enabled.")
    if not row.base_url or not row.service_username or row.service_password_encrypted is None:
        raise ValueError("FreeIPA settings are incomplete.")

    generated = generate_csr(row.common_name)
    client = _freeipa_client(row)
    session_cookie = client.login(row.service_username, decrypt_secret(row.service_password_encrypted))
    result = client.request_cert(
        session_cookie,
        csr_pem=generated.csr_pem,
        principal=row.service_principal,
        ca=row.ca,
        profile=row.profile,
    )

    cert_b64 = result.get("certificate")
    if not cert_b64:
        raise ValueError(f"FreeIPA did not return a certificate: {result}")
    # FreeIPA's documented cert_request response carries the issued
    # certificate as base64-encoded DER, not PEM - wrap it into PEM
    # ourselves so it's stored the same way as every other source.
    certificate = x509.load_der_x509_certificate(base64.b64decode(cert_b64))
    cert_pem = certificate.public_bytes(serialization.Encoding.PEM).decode()

    cert = service.install_certificate(
        db,
        source=TlsCertSource.FREEIPA,
        cert_pem=cert_pem,
        key_pem=generated.key_pem,
        subject=certificate.subject.rfc4514_string(),
        fingerprint_sha256=certificate.fingerprint(hashes.SHA256()).hex(),
        not_before=certificate.not_valid_before_utc,
        not_after=certificate.not_valid_after_utc,
        triggered_by=payload.get("triggered_by", "manual"),
        event=event,
        notes=payload.get("notes", ""),
        freeipa_request_id=str(result.get("request_id", "")) or None,
        freeipa_principal=row.service_principal,
    )
    return {"certificate_id": str(cert.id), "fingerprint": cert.fingerprint_sha256}


def freeipa_request_cert_job(db: Session, payload: dict) -> dict:
    return _freeipa_request_or_renew(db, payload, event="installed")


def freeipa_renew_cert_job(db: Session, payload: dict) -> dict:
    return _freeipa_request_or_renew(db, payload, event="renewed")


def renewal_check_job(db: Session, payload: dict) -> dict:
    """The scheduled heartbeat (mirrors signing.rotation_check_job).

    - self_signed nearing expiry: simply regenerated - there's no
      administrator input it could ever need, so making them notice and
      click a button for a zero-config fallback would be pointless.
    - freeipa nearing expiry, with auto_renew_enabled: re-requested the same
      way the manual "Request certificate" action does. A renewal failure
      (IPA unreachable, credentials revoked, ...) is logged and reported,
      never raised - the still-valid certificate stays active and the
      Overview warning keeps surfacing the situation until it's fixed.
    - manual nearing expiry: nothing this job can do about it - only the
      Overview-page warning (fed by the same GET /tls/active every sub-tab
      reads) surfaces the situation.
    """
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

    if cert.source == TlsCertSource.FREEIPA:
        ipa_row = freeipa_settings.get_settings_row(db)
        if not ipa_row.auto_renew_enabled:
            return {"action": "none"}
        if service.days_until(cert.not_after) > ipa_row.renew_before_days:
            return {"action": "none"}
        try:
            result = freeipa_renew_cert_job(
                db, {"triggered_by": "schedule", "notes": "Auto-renewed before expiry."}
            )
        except (FreeIPAAdapterError, ValueError) as exc:
            logger.error("FreeIPA auto-renewal failed: %s", exc)
            return {"action": "renewal_failed", "error": str(exc)[:2000]}
        return {"action": "renewed_freeipa", **result}

    return {"action": "none"}


def register() -> None:
    job_registry.register("tls.generate_selfsigned", generate_selfsigned_job)
    job_registry.register("tls.freeipa_test_connection", freeipa_test_connection_job)
    job_registry.register("tls.freeipa_request_cert", freeipa_request_cert_job)
    job_registry.register("tls.freeipa_renew_cert", freeipa_renew_cert_job)
    job_registry.register("tls.renewal_check", renewal_check_job)
