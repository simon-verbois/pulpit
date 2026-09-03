from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class DefaultSettings(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Singleton configuration row for instance-wide defaults PulpIT itself
    applies - never sent to Pulp as a setting of its own (Pulp has no
    concept of a global proxy; each Remote has its own proxy_url/username/
    password). Deliberately its own table, not a row in some shared generic
    "settings" table other modules would also write to (same precedent as
    SigningSettings, app/modules/signing/models.py). See service.py's
    get_settings_row for the singleton-row lookup.

    Currently just the default proxy PulpIT can pre-fill onto new Remotes
    with (not yet wired up - see the frontend's DefaultSettingsPage); more
    instance-wide defaults are expected to land as additional columns here
    over time, same as SigningSettings grew fields as capabilities were
    added.
    """

    __tablename__ = "default_settings"

    proxy_url: Mapped[str] = mapped_column(String(2048), default="")
    proxy_username: Mapped[str] = mapped_column(String(255), default="")
    # Fernet ciphertext (app/core/crypto.py) - NULL means "no proxy password
    # configured", never the raw value. Nothing in this codebase decrypts
    # this into an API response; it's read back only where it must actually
    # be used (e.g. a future Remote-creation prefill), never echoed to the
    # browser, same as Pulp's own Remote.proxy_password handling.
    proxy_password_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)

    @property
    def proxy_password_is_set(self) -> bool:
        return self.proxy_password_encrypted is not None
