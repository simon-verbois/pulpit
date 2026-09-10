from sqlalchemy import BigInteger, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class ComponentContentSize(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Cached total content size (bytes) per Pulp plugin component, refreshed
    periodically by a background job - never computed on an HTTP request
    (docs/UX.md "per-plugin storage-size breakdown was considered and
    dropped": Pulp has no such aggregate, so it means paging every content
    unit and summing referenced artifact sizes, too expensive for a
    dashboard request).

    A component with no row here (rather than a row with `size_bytes=0`)
    means "no content of this type has ever been seen" - core and certguard
    are expected to never get a row (docs/PULP_API.md: certguard has no
    content-bearing endpoint at all; core's OpenPGP objects aren't a normal
    content type). The frontend renders a missing entry the same way it
    already renders a missing `repositoryCounts` entry: "-", never a
    fabricated 0 (see PulpStatusSummary.tsx)."""

    __tablename__ = "component_content_sizes"

    component: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    size_bytes: Mapped[int] = mapped_column(BigInteger)


class RepositoryContentSize(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Same idea as ComponentContentSize, one row per repository instead of
    per plugin - the size of that repository's latest version (VERIFIED
    live: `/pulp/api/v3/content/` accepts `repository_version` as a filter,
    so this reuses the exact same generic content/artifact endpoints and the
    same per-run artifact size map, just scoped per repository - see
    jobs.py).

    Keyed by the repository's own `pulp_href` (stable across plugins,
    already what every RepositoriesPage keys its rows by) rather than name,
    which can be renamed and isn't unique across plugins. No row means "this
    repository's latest version has never been scanned yet" (freshly
    created, before the next hourly run) - the frontend shows "-", same
    convention as ComponentContentSize."""

    __tablename__ = "repository_content_sizes"

    repository_href: Mapped[str] = mapped_column(String(512), unique=True, index=True)
    size_bytes: Mapped[int] = mapped_column(BigInteger)


class ComponentRepositoryCount(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Cached repository count per Pulp plugin component, refreshed by a
    separate, much cheaper background job than the two size tables above -
    it only pages `/repositories/` for `pulp_href` (see
    jobs.py:refresh_repository_counts_job), never `/artifacts/` or
    `/content/`, so it runs on a much shorter interval (see module.py's
    `scheduled_jobs`). Same "no row means never seen" convention as the
    size tables - the frontend shows "-", not a fabricated 0."""

    __tablename__ = "component_repository_counts"

    component: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    count: Mapped[int] = mapped_column(Integer)
