from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.crypto import decrypt_secret, encrypt_secret
from app.modules.ldap.models import LdapSettings

_SIMPLE_FIELDS = (
    "enabled",
    "server_uri",
    "bind_dn",
    "start_tls",
    "user_search_base",
    "user_search_filter",
    "group_search_base",
    "group_search_filter",
    "group_type",
    "mirror_groups",
    "attr_first_name",
    "attr_last_name",
    "attr_email",
)


def get_settings_row(db: Session) -> LdapSettings:
    """Returns the singleton settings row, creating it (all defaults) on
    first access - same pattern as default_settings/signing's own
    get_settings_row."""
    row = (
        db.execute(select(LdapSettings).order_by(LdapSettings.created_at)).scalars().first()
    )
    if row is None:
        row = LdapSettings()
        db.add(row)
        db.flush()
    return row


def update_settings(db: Session, row: LdapSettings, changes: dict) -> LdapSettings:
    for field in _SIMPLE_FIELDS:
        if field in changes and changes[field] is not None:
            setattr(row, field, changes[field])
    if "bind_password" in changes and changes["bind_password"] is not None:
        password = changes["bind_password"]
        row.bind_password_encrypted = encrypt_secret(password) if password != "" else None
    if "require_group_dn" in changes and changes["require_group_dn"] is not None:
        require_group_dn = changes["require_group_dn"]
        row.require_group_dn = require_group_dn if require_group_dn != "" else None
    if "ca_cert" in changes and changes["ca_cert"] is not None:
        row.ca_cert = changes["ca_cert"] or None
    db.flush()
    return row


@dataclass
class ResolvedTestSettings:
    """The fields jobs.test_connection_job actually needs, resolved from a
    request's overrides falling back to the saved row - see schemas.py's
    LdapTestConnectionRequest docstring on why this exists (test a possibly-
    unsaved config, not necessarily what's in the database)."""

    server_uri: str
    bind_dn: str
    bind_password: str | None
    start_tls: bool
    ca_cert: str | None
    user_search_base: str
    user_search_filter: str
    group_search_base: str
    group_search_filter: str
    require_group_dn: str | None


def resolve_test_settings(row: LdapSettings, overrides: dict) -> ResolvedTestSettings:
    def _pick(field: str):
        value = overrides.get(field)
        return value if value is not None else getattr(row, field)

    bind_password = overrides.get("bind_password")
    if bind_password is None:
        bind_password = (
            decrypt_secret(row.bind_password_encrypted)
            if row.bind_password_encrypted is not None
            else None
        )

    return ResolvedTestSettings(
        server_uri=_pick("server_uri"),
        bind_dn=_pick("bind_dn"),
        bind_password=bind_password,
        start_tls=_pick("start_tls"),
        # "" is an explicit "system CAs only" (schemas.LdapTestConnectionRequest).
        ca_cert=_pick("ca_cert") or None,
        user_search_base=_pick("user_search_base"),
        user_search_filter=_pick("user_search_filter"),
        group_search_base=_pick("group_search_base"),
        group_search_filter=_pick("group_search_filter"),
        require_group_dn=_pick("require_group_dn"),
    )
