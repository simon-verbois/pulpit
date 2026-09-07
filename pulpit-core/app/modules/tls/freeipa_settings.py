"""FreeIPA provider settings - singleton row read/update, mirroring
ldap/service.py's own get_settings_row/update_settings exactly (same
"one table per module's settings", same write-only-password convention)."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.crypto import encrypt_secret
from app.modules.tls.models import TlsFreeIpaSettings

_SIMPLE_FIELDS = (
    "enabled",
    "base_url",
    "verify_tls",
    "common_name",
    "service_principal",
    "service_username",
    "ca",
    "auto_renew_enabled",
    "renew_before_days",
)


def get_settings_row(db: Session) -> TlsFreeIpaSettings:
    row = (
        db.execute(select(TlsFreeIpaSettings).order_by(TlsFreeIpaSettings.created_at))
        .scalars()
        .first()
    )
    if row is None:
        row = TlsFreeIpaSettings()
        db.add(row)
        db.flush()
    return row


def update_settings(db: Session, row: TlsFreeIpaSettings, changes: dict) -> TlsFreeIpaSettings:
    for field in _SIMPLE_FIELDS:
        if field in changes and changes[field] is not None:
            setattr(row, field, changes[field])
    if "service_password" in changes and changes["service_password"] is not None:
        password = changes["service_password"]
        row.service_password_encrypted = encrypt_secret(password) if password != "" else None
    if "profile" in changes and changes["profile"] is not None:
        profile = changes["profile"]
        row.profile = profile if profile != "" else None
    db.flush()
    return row
