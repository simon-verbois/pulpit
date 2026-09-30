"""GET /jobs - the job history behind the Tasks page's "Background jobs"
tab: newest first, own jobs only for non-staff, scheduled heartbeats hidden
by default, and `payload` never exposed (only `repository_href` from it)."""

from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from app.core.auth import CurrentUser, FullUser, get_full_user, require_authenticated_user
from app.core.database import get_db
from app.core.jobs.models import Job, JobStatus
from app.main import app

REPO = "/pulp/api/v3/repositories/rpm/rpm/abc/"


def _client(db, *, username="alice", is_staff=False):
    def database():
        yield db
    app.dependency_overrides[get_db] = database
    app.dependency_overrides[require_authenticated_user] = lambda: CurrentUser(username, "/users/2/")
    app.dependency_overrides[get_full_user] = lambda: FullUser(username, "/users/2/", is_staff)
    return TestClient(app)


@pytest.fixture(autouse=True)
def _clear_overrides():
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def jobs(db):
    now = datetime.now(UTC)
    rows = [
        Job(job_type="signing.resign_repository_packages", status=JobStatus.SUCCESS, requested_by="alice",
            payload={"repository_href": REPO, "fingerprint": "A" * 40}, scheduled_at=now,
            created_at=now - timedelta(minutes=3)),
        Job(job_type="signing.apply_signing_to_all_repositories", status=JobStatus.RUNNING, requested_by="bob",
            payload={}, scheduled_at=now, created_at=now - timedelta(minutes=2)),
        Job(job_type="signing.resign_repository_packages", status=JobStatus.QUEUED, requested_by=None,
            payload={"repository_href": REPO}, scheduled_at=now, created_at=now - timedelta(minutes=1)),
        Job(job_type="signing.detect_repository_content_changes", status=JobStatus.SUCCESS, requested_by=None,
            payload={}, scheduled_at=now, created_at=now),
    ]
    db.add_all(rows)
    db.commit()
    return rows


def test_non_staff_only_see_their_own_jobs(db, jobs):
    body = _client(db, username="alice").get("/api/v1/jobs").json()

    assert body["count"] == 1
    [job] = body["results"]
    assert job["id"] == str(jobs[0].id)
    assert job["repository_href"] == REPO
    assert "payload" not in job


def test_staff_see_every_job_newest_first_without_scheduled_heartbeats(db, jobs):
    body = _client(db, is_staff=True).get("/api/v1/jobs").json()

    assert body["count"] == 3
    assert [job["id"] for job in body["results"]] == [str(jobs[2].id), str(jobs[1].id), str(jobs[0].id)]


def test_scheduled_jobs_can_be_included(db, jobs):
    body = _client(db, is_staff=True).get("/api/v1/jobs", params={"include_scheduled": True}).json()

    assert body["count"] == 4


def test_filters_by_status_and_paginates(db, jobs):
    client = _client(db, is_staff=True)

    body = client.get("/api/v1/jobs", params=[("status", "queued"), ("status", "running")]).json()
    assert {job["status"] for job in body["results"]} == {"queued", "running"}

    page = client.get("/api/v1/jobs", params={"limit": 1, "offset": 1}).json()
    assert page["count"] == 3
    assert [job["id"] for job in page["results"]] == [str(jobs[1].id)]
