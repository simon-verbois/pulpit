from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.crypto import encrypt_secret
from app.modules.default_settings.models import DefaultSettings


def get_settings_row(db: Session) -> DefaultSettings:
    """Returns the singleton settings row, creating it (all defaults empty)
    on first access - same pattern as signing's get_settings_row."""
    row = (
        db.execute(select(DefaultSettings).order_by(DefaultSettings.created_at))
        .scalars()
        .first()
    )
    if row is None:
        row = DefaultSettings()
        db.add(row)
        db.flush()
    return row


def update_settings(db: Session, row: DefaultSettings, changes: dict) -> DefaultSettings:
    if "proxy_url" in changes and changes["proxy_url"] is not None:
        row.proxy_url = changes["proxy_url"]
    if "proxy_username" in changes and changes["proxy_username"] is not None:
        row.proxy_username = changes["proxy_username"]
    if "proxy_password" in changes and changes["proxy_password"] is not None:
        password = changes["proxy_password"]
        row.proxy_password_encrypted = encrypt_secret(password) if password != "" else None
    db.flush()
    return row
