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
    if "proxy_tls_validation" in changes and changes["proxy_tls_validation"] is not None:
        row.proxy_tls_validation = changes["proxy_tls_validation"]
    if "proxy_ca_cert" in changes and changes["proxy_ca_cert"] is not None:
        ca_cert = changes["proxy_ca_cert"]
        row.proxy_ca_cert = ca_cert if ca_cert != "" else None
    db.flush()
    return row


def publish_global_policy(row: DefaultSettings) -> None:
    """Publish runtime infrastructure policy, never duplicate Pulp resources."""
    from urllib.parse import urlsplit

    from pulpit_egress import publish

    from app.core.config import get_settings
    from app.core.crypto import decrypt_secret

    internal = urlsplit(get_settings().pulp_base_url).hostname
    publish({
        "proxy_url": row.proxy_url,
        "proxy_username": row.proxy_username,
        "proxy_password": decrypt_secret(row.proxy_password_encrypted) if row.proxy_password_encrypted else None,
        "ca_cert": row.proxy_ca_cert,
        "tls_validation": row.proxy_tls_validation,
        "bypass_hosts": sorted({"localhost", "127.0.0.1", "::1", "pulp", "pulp-pulp", "redis", internal or "localhost"}),
    })
