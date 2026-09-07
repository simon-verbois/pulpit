"""apply_proxy_to_all_remotes_job - Pulp itself is faked (no live instance in
this test environment), same convention as test_signing_jobs.py's
fake_key_manager for the one external dependency each job actually needs."""

import pytest

from app.modules.default_settings import jobs as default_settings_jobs
from app.modules.default_settings import service


class _FakePulpClient:
    def __init__(self, pages: list[list[dict]], *, fail_names: set[str] | None = None):
        self._pages = pages
        self._fail_names = fail_names or set()
        self.patched: list[tuple[str, dict]] = []

    def list_remotes_page(self, *, limit: int, offset: int) -> dict:
        page_index = offset // limit
        if page_index >= len(self._pages):
            return {"results": [], "next": None}
        results = self._pages[page_index]
        has_next = page_index + 1 < len(self._pages)
        return {"results": results, "next": "next-url" if has_next else None}

    def patch_remote(self, href: str, body: dict) -> dict:
        if any(f"/{name}/" in href for name in self._fail_names):
            from app.adapters.pulp.exceptions import PulpAdapterError

            raise PulpAdapterError("simulated failure", status_code=400)
        self.patched.append((href, body))
        return {"pulp_href": href, **body}


@pytest.fixture
def fake_pulp(monkeypatch):
    client = _FakePulpClient(
        [
            [
                {"pulp_href": "/pulp/api/v3/remotes/rpm/rpm/aaa/", "name": "aaa"},
                {"pulp_href": "/pulp/api/v3/remotes/file/file/bbb/", "name": "bbb"},
            ],
        ]
    )
    monkeypatch.setattr(default_settings_jobs, "get_pulp_client", lambda: client)
    return client


def test_applies_the_stored_proxy_to_every_remote(db, fake_pulp):
    service.update_settings(
        db,
        service.get_settings_row(db),
        {
            "proxy_url": "http://proxy.example.com:3128",
            "proxy_username": "proxyuser",
            "proxy_password": "s3cret",
            "proxy_tls_validation": False,
            "proxy_ca_cert": None,
        },
    )
    db.commit()

    result = default_settings_jobs.apply_proxy_to_all_remotes_job(db, {})

    assert result["updated_count"] == 2
    assert sorted(result["updated"]) == ["aaa", "bbb"]
    assert result["failed"] == []
    for _href, body in fake_pulp.patched:
        assert body["proxy_url"] == "http://proxy.example.com:3128"
        assert body["proxy_username"] == "proxyuser"
        assert body["proxy_password"] == "s3cret"
        assert body["tls_validation"] is False


def test_sends_no_password_field_change_when_none_is_configured(db, fake_pulp):
    result = default_settings_jobs.apply_proxy_to_all_remotes_job(db, {})
    assert result["updated_count"] == 2
    for _href, body in fake_pulp.patched:
        assert body["proxy_password"] is None
        assert body["proxy_url"] is None


def test_one_remote_failing_does_not_abort_the_rest(db, monkeypatch):
    client = _FakePulpClient(
        [
            [
                {"pulp_href": "/pulp/api/v3/remotes/rpm/rpm/aaa/", "name": "aaa"},
                {"pulp_href": "/pulp/api/v3/remotes/file/file/bbb/", "name": "bbb"},
            ],
        ],
        fail_names={"aaa"},
    )
    monkeypatch.setattr(default_settings_jobs, "get_pulp_client", lambda: client)

    result = default_settings_jobs.apply_proxy_to_all_remotes_job(db, {})

    assert result["updated_count"] == 1
    assert result["updated"] == ["bbb"]
    assert len(result["failed"]) == 1
    assert result["failed"][0]["name"] == "aaa"


def test_pages_through_every_remote(db, monkeypatch):
    client = _FakePulpClient(
        [
            [{"pulp_href": f"/pulp/api/v3/remotes/rpm/rpm/{i}/", "name": str(i)} for i in range(100)],
            [{"pulp_href": "/pulp/api/v3/remotes/rpm/rpm/100/", "name": "100"}],
        ]
    )
    monkeypatch.setattr(default_settings_jobs, "get_pulp_client", lambda: client)

    result = default_settings_jobs.apply_proxy_to_all_remotes_job(db, {})

    assert result["updated_count"] == 101
