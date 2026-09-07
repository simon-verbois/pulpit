"""apply_config_job / test_connection_job - Pulp and the LDAP server are
both faked (no live instances in this test environment), same convention
as test_default_settings_jobs.py's _FakePulpClient and
test_signing_jobs.py's fake_key_manager for the one external dependency
each job actually needs."""

from app.adapters.pulp.exceptions import PulpAdapterError
from app.modules.ldap import jobs as ldap_jobs
from app.modules.ldap import service


def test_apply_config_writes_manifest_and_reports_healthy(db, monkeypatch):
    written = {}

    def _fake_write_manifest(manifest, *, manifest_path):
        written["manifest"] = manifest
        written["path"] = manifest_path

    monkeypatch.setattr(ldap_jobs, "write_manifest", _fake_write_manifest)
    monkeypatch.setattr(ldap_jobs.time, "sleep", lambda _seconds: None)

    class _FakePulpClient:
        def get_status(self):
            return {"versions": []}

    monkeypatch.setattr(ldap_jobs, "get_pulp_client", lambda: _FakePulpClient())

    service.update_settings(
        db,
        service.get_settings_row(db),
        {
            "enabled": True,
            "server_uri": "ldaps://ldap.example.com:636",
            "bind_dn": "cn=readonly,dc=example,dc=com",
            "bind_password": "s3cret",
        },
    )
    db.commit()

    result = ldap_jobs.apply_config_job(db, {})

    assert result == {"manifest_written": True, "pulp_api_healthy": True}
    assert written["manifest"]["enabled"] is True
    assert written["manifest"]["bind_password"] == "s3cret"


def test_apply_config_reports_unhealthy_when_pulp_never_comes_back(db, monkeypatch):
    monkeypatch.setattr(ldap_jobs, "write_manifest", lambda manifest, *, manifest_path: None)
    monkeypatch.setattr(ldap_jobs.time, "sleep", lambda _seconds: None)
    # time.monotonic() must still advance past the retry deadline without a
    # real 30s wait - fake sleep already makes real time pass in
    # microseconds, but monotonic() itself is untouched, so this loop
    # naturally exits almost instantly once the (very short) deadline window
    # elapses. Force it to elapse on the first check instead of relying on
    # wall-clock timing in a test.
    monkeypatch.setattr(ldap_jobs, "_HEALTH_CHECK_TIMEOUT_SECONDS", 0)

    class _FailingPulpClient:
        def get_status(self):
            raise PulpAdapterError("simulated: connection refused")

    monkeypatch.setattr(ldap_jobs, "get_pulp_client", lambda: _FailingPulpClient())

    result = ldap_jobs.apply_config_job(db, {})

    assert result["manifest_written"] is True
    assert result["pulp_api_healthy"] is False
    assert "simulated" in result["error"]


def test_test_connection_reports_no_server_configured(db):
    result = ldap_jobs.test_connection_job(db, {})
    assert result == {"success": False, "error": "No LDAP server URI configured."}


def test_test_connection_binds_and_searches(db, monkeypatch):
    calls = {}

    class _FakeConnection:
        def __init__(self, server, user, password, auto_bind, receive_timeout):
            calls["user"] = user
            calls["password"] = password
            self.result = {"description": "success"}
            self.entries = [object()]

        def bind(self):
            return True

        def search(self, base, filter_, *, search_scope, size_limit):
            calls["search_base"] = base
            calls["search_filter"] = filter_

        def unbind(self):
            calls["unbound"] = True

    monkeypatch.setattr(ldap_jobs.ldap3, "Server", lambda uri, use_ssl: uri)
    monkeypatch.setattr(ldap_jobs.ldap3, "Connection", _FakeConnection)

    result = ldap_jobs.test_connection_job(
        db,
        {
            "server_uri": "ldap://ldap.example.com:389",
            "bind_dn": "cn=readonly,dc=example,dc=com",
            "bind_password": "s3cret",
            "user_search_base": "ou=people,dc=example,dc=com",
            "user_search_filter": "(uid=%(user)s)",
        },
    )

    assert result["success"] is True
    assert result["bound_as"] == "cn=readonly,dc=example,dc=com"
    assert result["user_search_matched"] is True
    assert calls["search_filter"] == "(uid=*)"
    assert calls["unbound"] is True


def test_test_connection_reports_bind_failure(db, monkeypatch):
    class _FakeConnection:
        def __init__(self, *args, **kwargs):
            self.result = {"description": "invalidCredentials"}

        def bind(self):
            return False

        def unbind(self):
            pass

    monkeypatch.setattr(ldap_jobs.ldap3, "Server", lambda uri, use_ssl: uri)
    monkeypatch.setattr(ldap_jobs.ldap3, "Connection", _FakeConnection)

    result = ldap_jobs.test_connection_job(
        db,
        {"server_uri": "ldap://ldap.example.com:389", "bind_dn": "cn=bad", "bind_password": "x"},
    )

    assert result["success"] is False
    assert "invalidCredentials" in result["error"]
