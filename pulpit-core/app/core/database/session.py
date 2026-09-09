from collections.abc import Generator, Iterator
from contextlib import contextmanager

from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings

_engine = create_engine(get_settings().database_url, pool_pre_ping=True, future=True)

if _engine.dialect.name == "sqlite":
    # Embedded-SQLite mode (docs/DEPLOYMENT.md,
    # docs/adr/0007-merged-pulpit-container.md): the API and the worker loop
    # are separate OS processes (even sharing one container) that both open
    # their own connection to the same file - SQLite's default rollback-
    # journal mode only allows one writer at a time and fails fast
    # ("database is locked") rather than waiting, which the worker's every-
    # few-seconds polling would hit constantly. WAL mode allows concurrent
    # readers alongside one writer; busy_timeout bounds contention
    # between short transactions.
    # WAL still permits only one writer: jobs commit their claim before I/O.
    # No-op for Postgres (this block never runs), which handles concurrent
    # writers natively.
    @event.listens_for(_engine, "connect")
    def _set_sqlite_pragmas(dbapi_connection, connection_record) -> None:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.close()

SessionLocal = sessionmaker(bind=_engine, autoflush=False, autocommit=False, future=True)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency: one session per request, always closed."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def session_scope() -> Iterator[Session]:
    """Session for non-request contexts (the worker's job loop)."""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
