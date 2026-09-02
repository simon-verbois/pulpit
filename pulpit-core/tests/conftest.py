"""Test infrastructure.

Requires a real, disposable PostgreSQL instance (docs/TESTING.md's mocking
policy for the main frontend applies here too: "real integration ... remains
mandatory", and this module's models use Postgres-specific types - JSONB,
native UUID - that a SQLite substitute couldn't exercise faithfully).
Point PULPIT_CORE_DATABASE_URL at one (the `pulpit-core-db` Compose service,
or any throwaway `docker run postgres:16-alpine`) before running `pytest`.
"""

import os

os.environ.setdefault(
    "PULPIT_CORE_DATABASE_URL",
    "postgresql+psycopg://pulpit_core:pulpit_core@localhost:15432/pulpit_core",
)

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.core.database.base import Base
from app.core.events.models import EventLog  # noqa: F401
from app.core.jobs.models import Job  # noqa: F401
from app.modules.content_size.models import (  # noqa: F401
    ComponentContentSize,
    RepositoryContentSize,
)
from app.modules.registry import register_all
from app.modules.signing.models import (  # noqa: F401
    SigningKey,
    SigningPulpService,
    SigningRotation,
    SigningSettings,
)

_engine = create_engine(get_settings().database_url, future=True)
_TestSession = sessionmaker(bind=_engine, future=True)


@pytest.fixture(scope="session", autouse=True)
def _schema():
    Base.metadata.create_all(_engine)
    # Normally done once by FastAPI's/the worker's startup hook (app/main.py,
    # worker/main.py) - tests call jobs.py handlers directly without going
    # through either process, so the job registry needs populating here too.
    register_all()
    yield
    Base.metadata.drop_all(_engine)


@pytest.fixture(autouse=True)
def _clean_tables():
    with _engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(text(f'TRUNCATE TABLE "{table.name}" CASCADE'))
    yield


@pytest.fixture
def db():
    session = _TestSession()
    try:
        yield session
        session.commit()
    finally:
        session.close()
