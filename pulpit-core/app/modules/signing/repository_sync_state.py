"""Read/write helpers for `signing_repository_sync_state` (models.py) - the
per-repository "highest Pulp repository version already evaluated for
resigning" watermark. See `RepositorySigningSyncState`'s own docstring for
the full rationale; this module is just the small set of operations
`jobs.py` needs against it:

- `version_number`/`version_href`: convert between a Pulp repository
  version href (`.../versions/<n>/`) and the plain integer Pulpit tracks -
  the same convention `resign_repository_packages_job` already relied on
  informally (checking `.../versions/0` to mean "never synced").
- `needs_resign`: the cheap check both the post-sync delta detector and
  `apply_signing_to_all_repositories_job` use to decide whether a
  repository has any content newer than what's already been evaluated.
- `advance`: called by `resign_repository_packages_job` once a run finishes
  with zero failures, moving the watermark forward.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.signing.models import RepositorySigningSyncState


def version_number(version_href: str) -> int:
    return int(version_href.rstrip("/").rsplit("/", 1)[-1])


def version_href(repository_href: str, number: int) -> str:
    return f"{repository_href.rstrip('/')}/versions/{number}/"


def _get(db: Session, repository_href: str) -> RepositorySigningSyncState | None:
    return db.execute(
        select(RepositorySigningSyncState).where(
            RepositorySigningSyncState.repository_href == repository_href
        )
    ).scalars().first()


def last_processed_version(db: Session, repository_href: str) -> int:
    row = _get(db, repository_href)
    return row.last_processed_version if row is not None else 0


def needs_resign(db: Session, repository_href: str, latest_version_href: str | None) -> bool:
    """True if `repository_href` has repository-version content beyond what
    was already covered by a clean resign run - used by
    `apply_signing_to_all_repositories_job` to check content conformance
    independently of Pulp signing-field configuration (task bug fix: a
    repository can already have the right `package_signing_service` and
    still contain packages that were never actually resigned)."""
    if not latest_version_href or latest_version_href.rstrip("/").endswith("/versions/0"):
        return False
    return version_number(latest_version_href) > last_processed_version(db, repository_href)


def advance(db: Session, repository_href: str, version: int) -> None:
    row = _get(db, repository_href)
    if row is None:
        row = RepositorySigningSyncState(repository_href=repository_href, last_processed_version=version)
        db.add(row)
    elif version > row.last_processed_version:
        row.last_processed_version = version
    db.flush()
