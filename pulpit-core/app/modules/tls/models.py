"""tls module models - exactly ONE active certificate for port 8443 at a
time, source in {self_signed, manual}, mutually exclusive - mirrors
the signing module's "one active signing key" precedent
(app/modules/signing/models.py). Cert/key bytes are NEVER stored here, only
on disk at Settings.tls_cert_dir/active/{cert,key}.pem: pulpit-core's own API
process has no reason to ever read private key material, and disk (not the
database) is also what nginx itself reads directly.
"""

import enum
from datetime import datetime

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database.base import Base, TimestampMixin, UTCDateTime, UUIDPrimaryKeyMixin


class TlsCertSource(str, enum.Enum):
    SELF_SIGNED = "self_signed"
    MANUAL = "manual"


class TlsCertificate(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """The currently active certificate - the row with the largest
    created_at (service.get_active_certificate), same "newest row wins"
    convention signing_settings' singleton lookup uses in reverse (there,
    oldest wins, since that table only ever has one row to begin with)."""

    __tablename__ = "tls_certificates"

    source: Mapped[TlsCertSource] = mapped_column(String(16))
    subject: Mapped[str] = mapped_column(String(512))
    fingerprint_sha256: Mapped[str] = mapped_column(String(64), index=True)
    not_before: Mapped[datetime] = mapped_column(UTCDateTime)
    not_after: Mapped[datetime] = mapped_column(UTCDateTime, index=True)


class TlsCertificateHistory(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Audit trail of every install/renewal/expiry event - lets the GUI show
    history without reconstructing it from tls_certificates alone (same role
    as SigningRotation for the signing module)."""

    __tablename__ = "tls_certificate_history"

    event: Mapped[str] = mapped_column(String(32))  # "installed"|"renewed"|"revoked"|"expired"
    source: Mapped[TlsCertSource] = mapped_column(String(16))
    fingerprint_sha256: Mapped[str] = mapped_column(String(64))
    not_after: Mapped[datetime] = mapped_column(UTCDateTime)
    triggered_by: Mapped[str] = mapped_column(String(32))  # "manual"|"schedule"|"bootstrap"
    notes: Mapped[str] = mapped_column(Text, default="")
