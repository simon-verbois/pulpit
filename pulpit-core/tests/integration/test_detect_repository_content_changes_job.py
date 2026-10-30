"""`detect_repository_content_changes_job` (jobs.py) - the scheduled job
that closes the "a sync doesn't automatically resign new RPMs" gap: it
compares every package-signing-enabled repository's `latest_version_href`
against `signing_repository_sync_state`'s watermark and enqueues an
incremental `signing.resign_repository_packages` job for anything that has
moved on, deduplicated so a repository already awaiting/undergoing a resign
never gets a second, redundant job."""

import httpx
import respx

from app.core.events.models import EventLog
from app.core.jobs.models import Job
from app.modules.signing import jobs as signing_jobs
from app.modules.signing.models import RepositorySigningSyncState

REPO_HREF = "/pulp/api/v3/repositories/rpm/rpm/abc/"
SERVICE_HREF = "/pulp/api/v3/signing-services/pkg/"
FINGERPRINT = "A" * 40


def _mock_repositories(*, latest_version: int, package_signing_service=SERVICE_HREF, fingerprint=FINGERPRINT):
    respx.get(
        "http://pulp:80/pulp/api/v3/repositories/rpm/rpm/", params={"limit": 100, "offset": 0}
    ).mock(
        return_value=httpx.Response(
            200,
            json={
                "results": [
                    {
                        "pulp_href": REPO_HREF,
                        "name": "abc",
                        "package_signing_service": package_signing_service,
                        "package_signing_fingerprint": fingerprint,
                        "metadata_signing_service": None,
                        "latest_version_href": f"{REPO_HREF}versions/{latest_version}/",
                    }
                ],
                "next": None,
            },
        )
    )


@respx.mock
def test_a_never_processed_repository_gets_a_full_first_pass_enqueued(db):
    _mock_repositories(latest_version=52)

    result = signing_jobs.detect_repository_content_changes_job(db, {})

    assert result == {"checked": 1, "enqueued": 1}
    job = db.query(Job).filter(Job.job_type == "signing.resign_repository_packages").one()
    assert job.payload["repository_href"] == REPO_HREF
    assert job.payload["fingerprint"] == FINGERPRINT
    assert job.payload["target_version"] == f"{REPO_HREF}versions/52/"
    assert "since_version" not in job.payload  # first-ever pass: no watermark to delta from

    assert db.query(EventLog).filter(EventLog.event_type == "repository.synced").count() == 1


@respx.mock
def test_a_repository_ahead_of_its_watermark_gets_an_incremental_delta_enqueued(db):
    db.add(RepositorySigningSyncState(repository_href=REPO_HREF, last_processed_version=51))
    db.flush()
    _mock_repositories(latest_version=52)

    result = signing_jobs.detect_repository_content_changes_job(db, {})

    assert result == {"checked": 1, "enqueued": 1}
    job = db.query(Job).filter(Job.job_type == "signing.resign_repository_packages").one()
    assert job.payload["since_version"] == f"{REPO_HREF}versions/51/"
    assert job.payload["target_version"] == f"{REPO_HREF}versions/52/"


@respx.mock
def test_a_repository_already_caught_up_is_not_enqueued(db):
    db.add(RepositorySigningSyncState(repository_href=REPO_HREF, last_processed_version=52))
    db.flush()
    _mock_repositories(latest_version=52)

    result = signing_jobs.detect_repository_content_changes_job(db, {})

    assert result == {"checked": 1, "enqueued": 0}
    assert db.query(Job).filter(Job.job_type == "signing.resign_repository_packages").count() == 0


@respx.mock
def test_a_repository_without_package_signing_configured_is_skipped(db):
    _mock_repositories(latest_version=52, package_signing_service=None, fingerprint=None)

    result = signing_jobs.detect_repository_content_changes_job(db, {})

    assert result == {"checked": 0, "enqueued": 0}


@respx.mock
def test_a_repository_with_a_resign_job_already_in_flight_is_not_enqueued_twice(db):
    _mock_repositories(latest_version=52)

    first = signing_jobs.detect_repository_content_changes_job(db, {})
    second = signing_jobs.detect_repository_content_changes_job(db, {})

    assert first["enqueued"] == 1
    assert second["enqueued"] == 0
    assert db.query(Job).filter(Job.job_type == "signing.resign_repository_packages").count() == 1


@respx.mock
def test_paging_pulp_does_not_hold_sqlite_writer(tmp_path):
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session

    from app.core.database.base import Base
    from app.core.jobs.service import enqueue_job

    engine = create_engine(f"sqlite:///{tmp_path / 'detect.sqlite'}", connect_args={"timeout": 0.01})
    try:
        Base.metadata.create_all(engine)
        _mock_repositories(latest_version=1)
        first = respx.get("http://pulp:80/pulp/api/v3/repositories/rpm/rpm/",
            params={"limit": 100, "offset": 0})
        first.respond(200, json={"results": [{"pulp_href": REPO_HREF,
            "package_signing_service": SERVICE_HREF, "package_signing_fingerprint": FINGERPRINT,
            "latest_version_href": f"{REPO_HREF}versions/1/"}], "next": "page2"})

        def second_page(request):
            with Session(engine) as other:
                enqueue_job(other, "concurrent.request", {}, requested_by="reader")
                other.commit()
            return httpx.Response(200, json={"results": [], "next": None})

        respx.get("http://pulp:80/pulp/api/v3/repositories/rpm/rpm/",
            params={"limit": 100, "offset": 1}).mock(side_effect=second_page)
        with Session(engine) as session:
            assert signing_jobs.detect_repository_content_changes_job(session, {}) == {"checked": 1, "enqueued": 1}
            session.commit()
            assert session.query(Job).count() == 2
    finally:
        engine.dispose()
