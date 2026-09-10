"""Test infrastructure.

Requires a real, disposable database (docs/TESTING.md's mocking policy for
the main frontend applies here too: "real integration ... remains
mandatory"). Defaults to PostgreSQL (the `pulpit-core-db` Compose service,
or any throwaway `docker run postgres:16-alpine`) since that's this
project's primary/CI-tested target, but every model uses only
dialect-generic SQLAlchemy types (sqlalchemy.Uuid/JSON, never the
Postgres-only postgresql.UUID/JSONB - VERIFIED round-trip identically on
both) specifically so the same test suite also runs against SQLite
(embedded mode, docs/DEPLOYMENT.md) - point PULPIT_CORE_DATABASE_URL at a
`sqlite:///...` path to exercise that instead.
"""

import os
import tempfile

os.environ.setdefault(
    "PULPIT_CORE_DATABASE_URL",
    "postgresql+psycopg://pulpit_core:pulpit_core@localhost:15432/pulpit_core",
)
# A real Fernet key (app/core/crypto.py) - test-only, never used outside
# this process. Needed by anything that round-trips default_settings'
# encrypted proxy password.
os.environ.setdefault(
    "PULPIT_CORE_SECRET_KEY",
    "jmmWNIM3cBAfr3tAb-0Vf8Uu2SlAm3fu1-91LslWQeg=",
)
# The real default (/var/lib/pulpit-tls) is only writable inside the actual
# container (entrypoint.sh chowns it) - tests writing an actual cert/key
# (tls module) need a location this process can always write to regardless
# of where it happens to run.
os.environ.setdefault("PULPIT_CORE_TLS_CERT_DIR", tempfile.mkdtemp(prefix="pulpit-tls-tests-"))

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.core.database.base import Base
from app.core.events.models import EventLog  # noqa: F401
from app.core.jobs.models import Job  # noqa: F401
from app.modules.api_compatibility.models import ApiCompatibilityCheck  # noqa: F401
from app.modules.content_size.models import (  # noqa: F401
    ComponentContentSize,
    RepositoryContentSize,
)
from app.modules.default_settings.models import DefaultSettings  # noqa: F401
from app.modules.nav_visibility.models import NavVisibleModule  # noqa: F401
from app.modules.registry import register_all
from app.modules.signing.models import (  # noqa: F401
    RepositorySigningSyncState,
    RpmSigningCache,
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
    # TRUNCATE is Postgres-only - SQLite (embedded mode, docs/DEPLOYMENT.md)
    # has no such statement at all. Plain DELETE FROM works identically on
    # both and is just as fast at this test suite's data volumes (a handful
    # of rows per table, never a real production-sized table).
    with _engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(text(f'DELETE FROM "{table.name}"'))
    yield


@pytest.fixture
def db():
    session = _TestSession()
    try:
        yield session
        session.commit()
    finally:
        session.close()
