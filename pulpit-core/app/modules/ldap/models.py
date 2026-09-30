import enum

from sqlalchemy import Boolean, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class LdapGroupType(str, enum.Enum):
    """The three django-auth-ldap GroupType classes covering the vast
    majority of real directories - see manifest.py's `_GROUP_TYPE_EXPR` for
    the exact class each one maps to. Deliberately not the full set
    django-auth-ldap ships (it has a dozen), same "small, well-known set
    over exhaustive coverage" scope as everywhere else new capability is
    added to this app."""

    GROUP_OF_NAMES = "group_of_names"
    POSIX_GROUP = "posix_group"
    NESTED_GROUP_OF_NAMES = "nested_group_of_names"


class LdapSettings(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Singleton configuration row for this instance's LDAP authentication
    config - never sent to pulpit-core's own auth (it has none, see
    app/core/auth.py's module docstring); Pulp/Django is the only place
    that ever actually authenticates against LDAP. Saving this row alone
    changes nothing - see jobs.py's `apply_config_job`, which is what
    actually pushes it out to Pulp (and restarts Pulp's API process to pick
    it up), same "save now, apply as an explicit separate step" split as
    default_settings' proxy config.

    Deliberately its own table, not a row bolted onto default_settings or
    signing's own settings tables - same "one table per module's settings"
    precedent (DefaultSettings, SigningSettings)."""

    __tablename__ = "ldap_settings"

    enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    server_uri: Mapped[str] = mapped_column(String(512), default="")
    bind_dn: Mapped[str] = mapped_column(String(512), default="")
    # Fernet ciphertext (app/core/crypto.py) - NULL means "no bind password
    # configured", never the raw value, same convention as
    # DefaultSettings.proxy_password_encrypted. Most directories require a
    # bind DN/password even for a read-only search account, but an
    # anonymous-bind directory is valid too, hence nullable rather than
    # required.
    bind_password_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    start_tls: Mapped[bool] = mapped_column(Boolean, default=False)
    # PEM CA certificate(s) the server's TLS certificate (ldaps:// or
    # STARTTLS) must chain to - for a directory signed by an internal CA the
    # container's system trust store doesn't know. Public material, returned
    # in full like DefaultSettings.proxy_ca_cert. NULL means "system CAs only".
    ca_cert: Mapped[str | None] = mapped_column(Text, nullable=True)

    user_search_base: Mapped[str] = mapped_column(String(512), default="")
    # django-auth-ldap's own %(user)s placeholder convention (AUTH_LDAP_USER_SEARCH) -
    # substituted with whatever username was typed into Pulp's login form.
    user_search_filter: Mapped[str] = mapped_column(String(512), default="(uid=%(user)s)")

    group_search_base: Mapped[str] = mapped_column(String(512), default="")
    group_search_filter: Mapped[str] = mapped_column(
        String(512), default="(objectClass=groupOfNames)"
    )
    group_type: Mapped[LdapGroupType] = mapped_column(
        String(32), default=LdapGroupType.GROUP_OF_NAMES
    )
    # AUTH_LDAP_REQUIRE_GROUP - NULL means "any successfully-bound user may
    # log in", same nullable-means-unset convention as bind_password above.
    require_group_dn: Mapped[str | None] = mapped_column(String(512), nullable=True)
    # AUTH_LDAP_MIRROR_GROUPS - creates/updates matching Django Group objects
    # from the user's LDAP group membership on every login, which is what
    # makes those groups show up in Pulpit's existing Groups UI
    # (src/features/access/groups/) with zero UI changes of our own.
    mirror_groups: Mapped[bool] = mapped_column(Boolean, default=True)

    attr_first_name: Mapped[str] = mapped_column(String(64), default="givenName")
    attr_last_name: Mapped[str] = mapped_column(String(64), default="sn")
    attr_email: Mapped[str] = mapped_column(String(64), default="mail")

    @property
    def bind_password_is_set(self) -> bool:
        return self.bind_password_encrypted is not None
