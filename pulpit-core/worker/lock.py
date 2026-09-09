"""One worker per database: signing and certificate side effects are serialized.

The lock is released by the OS/database on process death, so startup recovery
cannot mark another live worker's jobs as interrupted.
"""
import fcntl
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

from sqlalchemy import text

from app.core.database.session import _engine


@contextmanager
def worker_lock() -> Iterator[None]:
    if _engine.dialect.name == "sqlite":
        path = Path(str(_engine.url.database) + ".worker.lock")
        with path.open("a") as lock:
            try:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError as exc:
                raise RuntimeError("A worker is already running for this database") from exc
            yield
    else:
        with _engine.connect() as connection:
            if not connection.execute(text("SELECT pg_try_advisory_lock(70685701)")).scalar():
                raise RuntimeError("A worker is already running for this database")
            try:
                yield
            finally:
                connection.execute(text("SELECT pg_advisory_unlock(70685701)"))
