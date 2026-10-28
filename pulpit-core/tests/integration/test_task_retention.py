"""task_retention: defaults to 90 days enabled, the daily job purges every
final state older than the retention window, and a disabled automatic purge
is skipped unless the staff "Purge now" request forces it."""

import uuid
from contextlib import contextmanager
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

import app.main as main_module
from app.adapters.pulp.exceptions import PulpAdapterError
from app.core.auth import CurrentUser, FullUser, get_full_user, require_authenticated_user
from app.core.database import get_db
from app.core.jobs.models import Job
from app.modules.task_retention import jobs, service
from app.modules.task_retention.jobs import PURGED_STATES
from worker import main as worker


class _FakePulp:
    def __init__(self, error: Exception | None = None, *, state: str = "completed"):
        self.calls: list[dict] = []
        self.waited_for: list[str] = []
        self.error = error
        self.state = state

    def purge_tasks(self, *, finished_before, states):
        self.calls.append({"finished_before": finished_before, "states": states})
        if self.error:
            raise self.error
        return {"task": "/pulp/api/v3/tasks/abc/"}

    def wait_for_task(self, href):
        self.waited_for.append(href)
        return {"state": self.state, "error": {"description": "upstream purge failure"}}


def _client(db, *, is_staff=True):
    def _db():
        yield db

    main_module.app.dependency_overrides[get_db] = _db
    main_module.app.dependency_overrides[require_authenticated_user] = lambda: CurrentUser(
        username="admin", pulp_href="/pulp/api/v3/users/1/"
    )
    main_module.app.dependency_overrides[get_full_user] = lambda: FullUser(
        username="admin", pulp_href="/pulp/api/v3/users/1/", is_staff=is_staff
    )
    return TestClient(main_module.app)


@pytest.fixture
def staff_client(db):
    try:
        yield _client(db)
    finally:
        main_module.app.dependency_overrides.clear()


def test_defaults_are_enabled_and_ninety_days(db):
    row = service.get_settings_row(db)
    assert (row.enabled, row.retention_days) == (True, 90)


def test_purge_job_purges_all_final_states_older_than_retention(db, monkeypatch):
    pulp = _FakePulp()
    monkeypatch.setattr(jobs, "get_pulp_client", lambda: pulp)

    result = jobs.purge_job(db, {})

    (call,) = pulp.calls
    assert call["states"] == PURGED_STATES
    expected = datetime.now(UTC) - timedelta(days=90)
    assert abs(call["finished_before"] - expected) < timedelta(minutes=1)
    assert result["pulp_task"] == "/pulp/api/v3/tasks/abc/"
    assert pulp.waited_for == [result["pulp_task"]]
    row = service.get_settings_row(db)
    assert row.last_run_at is not None and row.last_run_error is None


def test_disabled_automatic_purge_is_skipped_but_manual_still_runs(db, monkeypatch):
    pulp = _FakePulp()
    monkeypatch.setattr(jobs, "get_pulp_client", lambda: pulp)
    service.update_settings(db, service.get_settings_row(db), {"enabled": False})

    assert "skipped" in jobs.purge_job(db, {})
    assert pulp.calls == []
    jobs.purge_job(db, {"manual": True})
    assert len(pulp.calls) == 1


def test_purge_failure_is_recorded_and_raised(db, monkeypatch):
    monkeypatch.setattr(jobs, "get_pulp_client", lambda: _FakePulp(PulpAdapterError("boom")))

    with pytest.raises(PulpAdapterError):
        jobs.purge_job(db, {})
    db.rollback()
    assert "boom" in service.get_settings_row(db).last_run_error


@pytest.mark.parametrize("state", ["failed", "canceled", "skipped"])
def test_unsuccessful_pulp_task_is_not_reported_as_a_success(db, monkeypatch, state):
    monkeypatch.setattr(jobs, "get_pulp_client", lambda: _FakePulp(state=state))
    with pytest.raises(PulpAdapterError, match="upstream purge failure"):
        jobs.purge_job(db, {})
    db.rollback()
    assert "upstream purge failure" in service.get_settings_row(db).last_run_error


@pytest.mark.parametrize("dispatch_failure", [True, False])
def test_worker_preserves_failed_purge_diagnostics(db, monkeypatch, dispatch_failure):
    sessions = sessionmaker(bind=db.get_bind(), autoflush=False)

    @contextmanager
    def scope():
        with sessions() as session:
            try:
                yield session
                session.commit()
            except Exception:
                session.rollback()
                raise

    monkeypatch.setattr(worker, "session_scope", scope)
    monkeypatch.setattr(worker.job_registry, "known_types", lambda: [jobs.PURGE_JOB_TYPE])
    pulp = (
        _FakePulp(PulpAdapterError("dispatch failed"))
        if dispatch_failure
        else _FakePulp(state="failed")
    )
    monkeypatch.setattr(jobs, "get_pulp_client", lambda: pulp)
    with scope() as session:
        job = worker.enqueue_job(session, jobs.PURGE_JOB_TYPE, {"manual": True})
        job.max_attempts = 1
        job_id = job.id

    assert worker._run_one_job()

    with scope() as session:
        assert session.get(Job, job_id).status == "failed"
        row = service.get_settings_row(session)
        assert row.last_run_at is not None
        assert (
            "dispatch failed" if dispatch_failure else "upstream purge failure"
        ) in row.last_run_error


def test_settings_routes_are_staff_only(db):
    client = _client(db, is_staff=False)
    try:
        assert client.get("/api/v1/task_retention/settings").status_code == 403
        assert client.patch("/api/v1/task_retention/settings", json={}).status_code == 403
        assert client.post("/api/v1/task_retention/purge").status_code == 403
    finally:
        main_module.app.dependency_overrides.clear()


def test_patch_validates_and_persists(staff_client):
    assert staff_client.get("/api/v1/task_retention/settings").json()["retention_days"] == 90
    assert (
        staff_client.patch(
            "/api/v1/task_retention/settings", json={"retention_days": 0}
        ).status_code
        == 422
    )
    body = staff_client.patch(
        "/api/v1/task_retention/settings", json={"retention_days": 30, "enabled": False}
    ).json()
    assert (body["retention_days"], body["enabled"]) == (30, False)


def test_purge_now_enqueues_a_manual_job(staff_client, db):
    response = staff_client.post("/api/v1/task_retention/purge")
    assert response.status_code == 202
    job = db.get(Job, uuid.UUID(response.json()["id"]))
    assert job.job_type == "task_retention.purge" and job.payload == {"manual": True}
