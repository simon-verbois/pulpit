"""seed_sample_fixtures_job - Pulp itself is faked (no live instance in this
test environment), same convention as test_default_settings_jobs.py's
_FakePulpClient for the one external dependency each job actually needs."""

import pytest

from app.adapters.pulp.exceptions import PulpAdapterError
from app.core.config import get_settings
from app.modules.fixture_seed import jobs as fixture_seed_jobs
from app.modules.fixture_seed import service
from app.modules.fixture_seed.fixtures import FIXTURES


@pytest.fixture(autouse=True)
def _fixture_seed_enabled(monkeypatch):
    """fixture_seed_enabled defaults to False (opt-in, see
    app/core/config/settings.py) - every test in this file except the
    "disabled" one below is exercising the seeding mechanism itself, not
    the toggle, so enable it here rather than repeating this in every test.
    test_skips_entirely_when_disabled_by_settings overrides this back to
    false itself, after this fixture has already run."""
    monkeypatch.setenv("PULPIT_CORE_FIXTURE_SEED_ENABLED", "true")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


class _FakePulpClient:
    def __init__(self, *, fail_remote_for: set[str] | None = None):
        self._fail_remote_for = fail_remote_for or set()
        self.created_remotes: list[tuple[str, dict]] = []
        self.created_repositories: list[tuple[str, dict]] = []
        self.synced: list[tuple[str, str]] = []
        self.created_distributions: list[tuple[str, dict]] = []

    def create_remote(self, type_path: str, body: dict) -> dict:
        if body["name"] in self._fail_remote_for:
            raise PulpAdapterError("simulated failure", status_code=400)
        self.created_remotes.append((type_path, body))
        return {"pulp_href": f"/pulp/api/v3/remotes/{type_path}/{body['name']}/"}

    def create_repository(self, type_path: str, body: dict) -> dict:
        self.created_repositories.append((type_path, body))
        return {"pulp_href": f"/pulp/api/v3/repositories/{type_path}/{body['name']}/"}

    def sync_repository(self, repository_href: str, remote_href: str) -> dict:
        self.synced.append((repository_href, remote_href))
        return {"task": f"{repository_href}sync-task/"}

    def create_distribution(self, type_path: str, body: dict) -> dict:
        self.created_distributions.append((type_path, body))
        return {"task": f"/pulp/api/v3/distributions/{type_path}/{body['name']}/task/"}

    def wait_for_task(self, task_href: str, **_kwargs) -> dict:
        return {"state": "completed", "error": None}


@pytest.fixture
def fake_pulp(monkeypatch):
    client = _FakePulpClient()
    monkeypatch.setattr(fixture_seed_jobs, "get_pulp_client", lambda: client)
    return client


def test_seeds_every_fixture_once(db, fake_pulp):
    result = fixture_seed_jobs.seed_sample_fixtures_job(db, {})

    assert result["failed"] == []
    assert [c["plugin"] for c in result["created"]] == [f.plugin for f in FIXTURES]
    syncable = [f for f in FIXTURES if f.repository_type_path is not None]
    remote_only = [f for f in FIXTURES if f.repository_type_path is None]
    assert len(fake_pulp.created_remotes) == len(FIXTURES)
    assert len(fake_pulp.created_repositories) == len(syncable)
    assert len(fake_pulp.synced) == len([f for f in syncable if f.sync])
    assert len(fake_pulp.created_distributions) == len(
        [f for f in syncable if f.distribution_type_path is not None]
    )
    for _type_path, body in fake_pulp.created_distributions:
        plugin = body["base_path"].split("/", 1)[0]
        assert body["name"] == body["base_path"]
        assert plugin in {"rpm", "file", "deb", "container", "ansible", "python"}
    assert remote_only  # sanity: maven/hugging_face really are remote-only fixtures
    assert service.has_seeded(db)


def test_skips_entirely_once_already_seeded(db, fake_pulp):
    service.mark_seeded(db)

    result = fixture_seed_jobs.seed_sample_fixtures_job(db, {})

    assert result == {"skipped": True, "reason": "already seeded"}
    assert fake_pulp.created_remotes == []


def test_one_plugin_failing_does_not_abort_the_rest(db, monkeypatch):
    client = _FakePulpClient(fail_remote_for={"pulpit-sample-rpm"})
    monkeypatch.setattr(fixture_seed_jobs, "get_pulp_client", lambda: client)

    result = fixture_seed_jobs.seed_sample_fixtures_job(db, {})

    assert len(result["failed"]) == 1
    assert result["failed"][0]["plugin"] == "rpm"
    assert len(result["created"]) == len(FIXTURES) - 1


def test_marks_seeded_even_when_some_plugins_fail(db, monkeypatch):
    client = _FakePulpClient(fail_remote_for={"pulpit-sample-rpm"})
    monkeypatch.setattr(fixture_seed_jobs, "get_pulp_client", lambda: client)

    fixture_seed_jobs.seed_sample_fixtures_job(db, {})

    assert service.has_seeded(db)


def test_skips_entirely_when_disabled_by_settings(db, fake_pulp, monkeypatch):
    """PULPIT_CORE_FIXTURE_SEED_ENABLED=false - the belt-and-suspenders
    early return in jobs.py itself (module.py's own scheduling gate is
    covered separately in test_fixture_seed_module.py), for a stray/manual
    enqueue of this job type even after the setting was flipped."""
    from app.core.config import get_settings

    monkeypatch.setenv("PULPIT_CORE_FIXTURE_SEED_ENABLED", "false")
    get_settings.cache_clear()
    try:
        result = fixture_seed_jobs.seed_sample_fixtures_job(db, {})
    finally:
        get_settings.cache_clear()

    assert result["skipped"] is True
    assert fake_pulp.created_remotes == []
    # Disabled means "never even attempted", not "attempted and marked done" -
    # distinct from the already-seeded no-op above, which DOES mark seeded.
    assert not service.has_seeded(db)
