"""api_compatibility module: check_job compares manifest.used_endpoints
against a (faked) live Pulp OpenAPI schema, persists exactly one result row,
and the read-only /latest route serves it to any authenticated user - same
"Pulp itself is faked" convention as test_default_settings_jobs.py's
_FakePulpClient (no live instance in this test environment)."""

from fastapi.testclient import TestClient

import app.main as main_module
from app.adapters.pulp.exceptions import PulpAdapterError
from app.core.auth import CurrentUser, require_authenticated_user
from app.core.database import get_db
from app.modules.api_compatibility import jobs as api_compatibility_jobs
from app.modules.api_compatibility import service


class _FakePulpClient:
    def __init__(self, paths: list[str], *, fail: bool = False):
        self._paths = paths
        self._fail = fail

    def get_openapi_schema(self) -> dict:
        if self._fail:
            raise PulpAdapterError("simulated failure", status_code=502)
        return {"paths": {p: {} for p in self._paths}}


def _client(db):
    def _override_db():
        yield db

    def _override_current_user():
        return CurrentUser(username="someone", pulp_href="/pulp/api/v3/users/1/")

    main_module.app.dependency_overrides[get_db] = _override_db
    main_module.app.dependency_overrides[require_authenticated_user] = _override_current_user
    return TestClient(main_module.app)


def test_check_job_finds_no_missing_endpoints_when_the_schema_covers_the_manifest(
    db, monkeypatch
):
    monkeypatch.setattr(
        api_compatibility_jobs, "used_endpoints", lambda: ["/repositories/rpm/rpm/"]
    )
    monkeypatch.setattr(
        api_compatibility_jobs,
        "get_pulp_client",
        lambda: _FakePulpClient(["/pulp/api/v3/repositories/rpm/rpm/"]),
    )

    result = api_compatibility_jobs.check_job(db, {})

    assert result == {"pulp_reachable": True, "missing_endpoints": []}
    latest = service.get_latest_check(db)
    assert latest.pulp_reachable is True
    assert latest.missing_endpoints == []
    assert latest.error is None


def test_check_job_reports_a_manifested_path_missing_from_the_live_schema(db, monkeypatch):
    monkeypatch.setattr(
        api_compatibility_jobs,
        "used_endpoints",
        lambda: ["/repositories/rpm/rpm/", "/repositories/deb/apt/"],
    )
    monkeypatch.setattr(
        api_compatibility_jobs,
        "get_pulp_client",
        # deb's endpoint is gone from this (simulated) live schema.
        lambda: _FakePulpClient(["/pulp/api/v3/repositories/rpm/rpm/"]),
    )

    result = api_compatibility_jobs.check_job(db, {})

    assert result["pulp_reachable"] is True
    assert result["missing_endpoints"] == ["/repositories/deb/apt/"]
    latest = service.get_latest_check(db)
    assert latest.missing_endpoints == ["/repositories/deb/apt/"]


def test_check_job_records_pulp_unreachable_instead_of_raising(db, monkeypatch):
    monkeypatch.setattr(
        api_compatibility_jobs, "used_endpoints", lambda: ["/repositories/rpm/rpm/"]
    )
    monkeypatch.setattr(
        api_compatibility_jobs,
        "get_pulp_client",
        lambda: _FakePulpClient([], fail=True),
    )

    result = api_compatibility_jobs.check_job(db, {})

    assert result["pulp_reachable"] is False
    assert "simulated failure" in result["error"]
    latest = service.get_latest_check(db)
    assert latest.pulp_reachable is False
    assert latest.missing_endpoints == []
    assert latest.error is not None


def test_get_latest_check_requires_authentication(db):
    response = TestClient(main_module.app).get("/api/v1/api_compatibility/latest")
    assert response.status_code == 401


def test_get_latest_check_404s_before_any_check_has_run(db):
    client = _client(db)
    try:
        response = client.get("/api/v1/api_compatibility/latest")
        assert response.status_code == 404
    finally:
        main_module.app.dependency_overrides.clear()


def test_get_latest_check_returns_the_persisted_result_to_any_authenticated_user(
    db, monkeypatch
):
    monkeypatch.setattr(
        api_compatibility_jobs, "used_endpoints", lambda: ["/repositories/rpm/rpm/"]
    )
    monkeypatch.setattr(
        api_compatibility_jobs,
        "get_pulp_client",
        lambda: _FakePulpClient(["/pulp/api/v3/repositories/rpm/rpm/"]),
    )
    api_compatibility_jobs.check_job(db, {})
    db.commit()

    client = _client(db)
    try:
        response = client.get("/api/v1/api_compatibility/latest")
        assert response.status_code == 200
        body = response.json()
        assert body["pulp_reachable"] is True
        assert body["missing_endpoints"] == []
        assert body["error"] is None
    finally:
        main_module.app.dependency_overrides.clear()
