from sqlalchemy import BigInteger, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class ComponentContentSize(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Historical table retained for migration compatibility; no runtime writer."""

    __tablename__ = "component_content_sizes"

    component: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    size_bytes: Mapped[int] = mapped_column(BigInteger)


class RepositoryContentSize(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Historical table retained for migration compatibility; no runtime writer."""

    __tablename__ = "repository_content_sizes"

    repository_href: Mapped[str] = mapped_column(String(512), unique=True, index=True)
    size_bytes: Mapped[int] = mapped_column(BigInteger)
