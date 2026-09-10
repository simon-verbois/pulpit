from sqlalchemy.orm import Session

from app.modules.content_size.models import (
    ComponentContentSize,
    ComponentRepositoryCount,
    RepositoryContentSize,
)


def list_content_sizes(db: Session) -> list[ComponentContentSize]:
    return db.query(ComponentContentSize).order_by(ComponentContentSize.component).all()


def replace_content_sizes(db: Session, totals: dict[str, int]) -> None:
    """Overwrites every row with this run's freshly computed totals - a
    component that no longer appears in `totals` (e.g. its last content unit
    was orphan-cleaned since the previous run) has its row deleted rather
    than left stale, since each run recomputes from scratch (see jobs.py)."""
    existing = {row.component: row for row in db.query(ComponentContentSize).all()}
    for component, size_bytes in totals.items():
        row = existing.pop(component, None)
        if row is None:
            db.add(ComponentContentSize(component=component, size_bytes=size_bytes))
        else:
            row.size_bytes = size_bytes
    for stale_row in existing.values():
        db.delete(stale_row)
    db.flush()


def list_repository_sizes(db: Session) -> list[RepositoryContentSize]:
    return db.query(RepositoryContentSize).order_by(RepositoryContentSize.repository_href).all()


def replace_repository_sizes(db: Session, totals: dict[str, int]) -> None:
    """Same replace-from-scratch semantics as replace_content_sizes, keyed
    by repository href - a deleted repository (or one with no content left
    in its latest version) simply doesn't get a row."""
    existing = {row.repository_href: row for row in db.query(RepositoryContentSize).all()}
    for repository_href, size_bytes in totals.items():
        row = existing.pop(repository_href, None)
        if row is None:
            db.add(RepositoryContentSize(repository_href=repository_href, size_bytes=size_bytes))
        else:
            row.size_bytes = size_bytes
    for stale_row in existing.values():
        db.delete(stale_row)
    db.flush()


def list_repository_counts(db: Session) -> list[ComponentRepositoryCount]:
    return db.query(ComponentRepositoryCount).order_by(ComponentRepositoryCount.component).all()


def replace_repository_counts(db: Session, totals: dict[str, int]) -> None:
    """Same replace-from-scratch semantics as replace_content_sizes, keyed
    by component - a plugin with no repositories left simply doesn't get a
    row on the next run."""
    existing = {row.component: row for row in db.query(ComponentRepositoryCount).all()}
    for component, count in totals.items():
        row = existing.pop(component, None)
        if row is None:
            db.add(ComponentRepositoryCount(component=component, count=count))
        else:
            row.count = count
    for stale_row in existing.values():
        db.delete(stale_row)
    db.flush()
