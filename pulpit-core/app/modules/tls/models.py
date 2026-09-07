"""tls module models - exactly ONE active certificate for port 8443 at a
time, source in {self_signed, manual, freeipa}, mutually exclusive - mirrors
the signing module's "one active signing key" precedent
(app/modules/signing/models.py). Cert/key bytes are NEVER stored here, only
on disk at Settings.tls_cert_dir/active/{cert,key}.pem: pulpit-core's own API
process has no reason to ever read private key material, and disk (not the
database) is also what nginx itself reads directly.
"""

import enum
from datetime import datetime

from sqlalchemy import Boolean, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database.base import Base, TimestampMixin, UTCDateTime, UUIDPrimaryKeyMixin


class TlsCertSource(str, enum.Enum):
    SELF_SIGNED = "self_signed"
    MANUAL = "manual"
    FREEIPA = "freeipa"


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
    # FreeIPA bookkeeping only - always null for self_signed/manual certs.
    freeipa_request_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    freeipa_principal: Mapped[str | None] = mapped_column(String(255), nullable=True)


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


class TlsFreeIpaSettings(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Singleton configuration row for the FreeIPA provider - same "one table
    per module's settings" precedent as LdapSettings/SigningSettings.

    Auth is password/session-cookie JSON-RPC (login to /ipa/session/
    login_password, then /ipa/session/json with the resulting cookie),
    deliberately NOT Kerberos/GSSAPI/keytabs - see app/adapters/freeipa/
    client.py's module docstring. `service_username`/`service_password_*`
    are the automation account's own credentials (created either by the
    setup wizard or pasted in manually after following docs/tls.md's
    manual-mode instructions) - never the administrator's own IPA login."""

    __tablename__ = "tls_freeipa_settings"

    enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    base_url: Mapped[str] = mapped_column(String(255), default="")
    verify_tls: Mapped[bool] = mapped_column(Boolean, default=True)
    # The hostname a certificate is issued for (e.g. "pulpit.example.com") -
    # kept as its own field rather than parsed out of service_principal, so
    # there's no fragile "HTTP/<host>@REALM" string-splitting anywhere.
    common_name: Mapped[str] = mapped_column(String(255), default="")
    # The IPA service principal certificates are requested FOR (e.g.
    # "HTTP/pulpit.example.com@EXAMPLE.COM") - distinct from the automation
    # account below, which is WHO makes the request.
    service_principal: Mapped[str] = mapped_column(String(255), default="")
    service_username: Mapped[str] = mapped_column(String(255), default="")
    # Fernet ciphertext (app/core/crypto.py) - NULL means "no automation
    # account configured yet", never the raw value, same convention as
    # LdapSettings.bind_password_encrypted.
    service_password_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    ca: Mapped[str] = mapped_column(String(64), default="ipa")
    profile: Mapped[str | None] = mapped_column(String(64), nullable=True)
    auto_renew_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    renew_before_days: Mapped[int] = mapped_column(Integer, default=30)

    @property
    def service_password_is_set(self) -> bool:
        return self.service_password_encrypted is not None
