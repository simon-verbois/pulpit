"""One-shot CLI entrypoint: `python3 -m app.modules.tls.bootstrap_selfsigned`.

Run by deployment/docker/pulpit/entrypoint.sh, as the `pulpit` user, after
migrations and before nginx starts - nginx hard-fails to start at all without
something already at Settings.tls_cert_dir/active/{cert,key}.pem, and on a
brand-new deployment nothing has written one yet (a manual/FreeIPA cert from
a previous run takes precedence - entrypoint.sh only calls this when those
files are missing).
"""

import logging

from app.core.config import get_settings
from app.core.database import session_scope
from app.modules.tls import service
from app.modules.tls.models import TlsCertSource
from app.modules.tls.selfsigned import generate_selfsigned

logging.basicConfig(level=get_settings().log_level)
logger = logging.getLogger(__name__)


def main() -> None:
    settings = get_settings()
    generated = generate_selfsigned(
        common_name=settings.tls_selfsigned_common_name,
        validity_days=settings.tls_selfsigned_validity_days,
    )
    with session_scope() as db:
        service.install_certificate(
            db,
            source=TlsCertSource.SELF_SIGNED,
            cert_pem=generated.cert_pem,
            key_pem=generated.key_pem,
            subject=generated.subject,
            fingerprint_sha256=generated.fingerprint_sha256,
            not_before=generated.not_before,
            not_after=generated.not_after,
            triggered_by="bootstrap",
            notes="Automatic self-signed fallback generated on first boot.",
            # nginx hasn't started yet at this point in entrypoint.sh - it
            # reads these files at its own startup, no reload needed.
            request_reload=False,
        )
    logger.info(
        "Generated self-signed TLS fallback certificate (fingerprint %s)",
        generated.fingerprint_sha256,
    )


if __name__ == "__main__":
    main()
