import enum

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class TrustedCaStatus(str, enum.Enum):
    # Not yet reconciled into Pulp's trust store - either just created, or
    # no PulpCommandExecutor is configured at all (jobs.py's fall-back).
    PENDING = "pending"
    # Last sync confirmed this certificate's file was written and
    # `update-ca-trust` ran successfully.
    APPLIED = "applied"
    # Last sync attempt ran but failed (see last_error) - e.g.
    # update-ca-trust isn't present in whatever image `pulp` is actually
    # running.
    FAILED = "failed"


class TrustedCaCertificate(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """An administrator-supplied CA certificate PulpIT keeps Pulp's own
    OCI-image trust store in sync with (app/adapters/pulp/ca_trust.py), so
    sync/proxy connections that terminate at (or are intercepted by)
    something signed by this CA - most commonly a corporate TLS-inspecting
    proxy - are trusted by Pulp itself, not just by the browser/pulpit-core.

    Public certificate material only, never a private key - stored as plain
    PEM text with no encryption (app/core/crypto.py is only for secrets
    that must round-trip back to plaintext; a CA certificate is meant to be
    shared, storing it in cleartext is not a weakening of anything).
    """

    __tablename__ = "trusted_ca_certificates"

    name: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    pem: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(16), default=TrustedCaStatus.PENDING)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
