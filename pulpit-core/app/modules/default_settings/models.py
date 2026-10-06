from sqlalchemy import Boolean, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class DefaultSettings(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """GUI-managed global outbound policy, published to the shared runtime volume.

    Pulp resources remain in Pulp; this row owns application infrastructure
    configuration and the encrypted proxy credential only.
    """

    __tablename__ = "default_settings"

    proxy_url: Mapped[str] = mapped_column(String(2048), default="")
    proxy_username: Mapped[str] = mapped_column(String(255), default="")
    # Decrypted only when publishing the private runtime policy, never to a browser.
    proxy_password_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Applies to all outgoing HTTP connections, including ULN authentication.
    proxy_tls_validation: Mapped[bool] = mapped_column(Boolean, default=True)
    # Public CA material added to application bundles and container trust stores.
    proxy_ca_cert: Mapped[str | None] = mapped_column(Text, nullable=True)

    @property
    def proxy_password_is_set(self) -> bool:
        return self.proxy_password_encrypted is not None
