"""apply_config_job / test_connection_job - Pulp and the LDAP server are
both faked (no live instances in this test environment), same convention
as test_default_settings_jobs.py's _FakePulpClient and
test_signing_jobs.py's fake_key_manager for the one external dependency
each job actually needs."""

import socket
import ssl

from ldap3.core.exceptions import LDAPSocketOpenError, communication_exception_factory
from ldap3.core.results import RESULT_NO_SUCH_OBJECT, RESULT_SUCCESS

from app.adapters.pulp.exceptions import PulpAdapterError
from app.core.config import get_settings
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

    monkeypatch.setattr(ldap_jobs.ldap3, "Server", lambda uri, **kwargs: uri)
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

    monkeypatch.setattr(ldap_jobs.ldap3, "Server", lambda uri, **kwargs: uri)
    monkeypatch.setattr(ldap_jobs.ldap3, "Connection", _FakeConnection)

    result = ldap_jobs.test_connection_job(
        db,
        {"server_uri": "ldap://ldap.example.com:389", "bind_dn": "cn=bad", "bind_password": "x"},
    )

    assert result["success"] is False
    assert "invalidCredentials" in result["error"]


def test_ldap_test_connection_timeout_setting_is_an_int():
    """Regression test for the reported bug: ldap3.Connection(receive_timeout=...)
    hands this straight to struct.pack('LL', ...) with no int() coercion of its
    own, so a float here (e.g. the old `10.0` default) raises
    `struct.error: required argument is not an integer` the moment Test
    connection is clicked."""
    assert isinstance(get_settings().ldap_test_connection_timeout_seconds, int)


def test_test_connection_casts_timeout_to_int_at_the_call_site_too(db, monkeypatch):
    """Even if some future settings override handed back a float (e.g. a
    stale .env), the call sites themselves must still coerce to int - this
    is the exact line that raised `struct.error: required argument is not
    an integer` for the reported bug."""
    captured: dict = {}

    class _FakeConnection:
        def __init__(self, server, user, password, auto_bind, receive_timeout):
            captured["receive_timeout"] = receive_timeout
            self.result = {"description": "success"}
            self.entries: list = []

        def bind(self):
            return True

        def unbind(self):
            pass

    def _fake_server(uri, **kwargs):
        captured["connect_timeout"] = kwargs["connect_timeout"]
        return uri

    class _FloatSettings:
        ldap_test_connection_timeout_seconds = 10.0

    monkeypatch.setattr(ldap_jobs, "get_settings", lambda: _FloatSettings())
    monkeypatch.setattr(ldap_jobs.ldap3, "Server", _fake_server)
    monkeypatch.setattr(ldap_jobs.ldap3, "Connection", _FakeConnection)

    result = ldap_jobs.test_connection_job(db, {"server_uri": "ldap://ldap.example.com:389"})

    assert result["success"] is True
    assert captured["receive_timeout"] == 10
    assert isinstance(captured["receive_timeout"], int)
    assert captured["connect_timeout"] == 10
    assert isinstance(captured["connect_timeout"], int)


def test_test_connection_rejects_uri_without_ldap_scheme(db):
    result = ldap_jobs.test_connection_job(db, {"server_uri": "ldap.example.com:389"})

    assert result["success"] is False
    assert "ldap://" in result["error"]
    assert "ldaps://" in result["error"]


def test_test_connection_rejects_starttls_combined_with_ldaps(db):
    result = ldap_jobs.test_connection_job(
        db,
        {"server_uri": "ldaps://ldap.example.com:636", "start_tls": True},
    )

    assert result["success"] is False
    assert "STARTTLS" in result["error"]


def test_test_connection_rejects_bind_dn_without_password(db):
    """RFC 4513 5.1.2 unauthenticated bind: a DN with an empty password can
    succeed without the server checking credentials at all, which would make
    this test misleadingly report success."""
    result = ldap_jobs.test_connection_job(
        db,
        {
            "server_uri": "ldap://ldap.example.com:389",
            "bind_dn": "cn=readonly,dc=example,dc=com",
            "bind_password": "",
        },
    )

    assert result["success"] is False
    assert "unauthenticated bind" in result["error"]


def test_test_connection_allows_anonymous_bind_with_no_dn_and_no_password(db, monkeypatch):
    """Anonymous bind (no DN at all) is a legitimate, deliberate configuration
    - only a DN with a *missing* password should be rejected."""

    class _FakeConnection:
        def __init__(self, *args, **kwargs):
            self.result = {"description": "success"}
            self.entries: list = []

        def bind(self):
            return True

        def unbind(self):
            pass

    monkeypatch.setattr(ldap_jobs.ldap3, "Server", lambda uri, **kwargs: uri)
    monkeypatch.setattr(ldap_jobs.ldap3, "Connection", _FakeConnection)

    result = ldap_jobs.test_connection_job(db, {"server_uri": "ldap://ldap.example.com:389"})

    assert result["success"] is True
    assert result["bound_as"] == "(anonymous)"


def test_test_connection_classifies_dns_failure_wrapped_as_a_stdlib_exception(db, monkeypatch):
    """Defense in depth: if a socket.gaierror ever does reach here already
    wrapped the normal ldap3 way (multiply-inherited via
    communication_exception_factory), it must still be classified as DNS."""

    def _raise_dns_failure(*args, **kwargs):
        raise communication_exception_factory(
            LDAPSocketOpenError, socket.gaierror("Name or service not known")
        )("dns lookup failed")

    monkeypatch.setattr(ldap_jobs.ldap3, "Server", lambda uri, **kwargs: uri)
    monkeypatch.setattr(ldap_jobs.ldap3, "Connection", _raise_dns_failure)

    result = ldap_jobs.test_connection_job(
        db, {"server_uri": "ldap://nonexistent.invalid:389"}
    )

    assert result["success"] is False
    assert "DNS" in result["error"]


def test_test_connection_classifies_real_dns_failure_shape(db, monkeypatch):
    """VERIFIED against a real, running instance (see the LDAP audit): ldap3
    actually swallows socket.gaierror itself (ldap3/core/server.py's
    address_info property) and raises a plain LDAPSocketOpenError('invalid
    server address') instead - with no stdlib exception left to
    isinstance() against. This is the shape a real unresolvable hostname
    actually takes, unlike the (also-handled, but never actually hit in
    practice) multiply-inherited shape above."""

    def _raise_invalid_server_address(*args, **kwargs):
        raise LDAPSocketOpenError("invalid server address")

    monkeypatch.setattr(ldap_jobs.ldap3, "Server", lambda uri, **kwargs: uri)
    monkeypatch.setattr(ldap_jobs.ldap3, "Connection", _raise_invalid_server_address)

    result = ldap_jobs.test_connection_job(
        db, {"server_uri": "ldap://nonexistent.invalid:389"}
    )

    assert result["success"] is False
    assert "DNS" in result["error"] or "resolve" in result["error"].lower()


def test_test_connection_does_not_crash_when_the_port_is_not_actually_ldap(db, monkeypatch):
    """Regression test: VERIFIED against a real, running instance (see the
    LDAP audit) - a reachable TCP port that answers, but isn't actually
    speaking the LDAP protocol (e.g. the URI points at an HTTP service by
    mistake), makes ldap3's BER decoder raise a bare `KeyError` while
    parsing the bind response - not any LDAPException subtype. Before this
    fix, `except ldap3.core.exceptions.LDAPException` didn't catch it at
    all, and the job crashed exactly like the reported float-timeout bug
    did (a raw, unhandled exception instead of a clean {"success": False}
    result)."""

    class _FakeConnection:
        def __init__(self, *args, **kwargs):
            pass

        def bind(self):
            raise KeyError((1, 20))

        def unbind(self):
            pass

    monkeypatch.setattr(ldap_jobs.ldap3, "Server", lambda uri, **kwargs: uri)
    monkeypatch.setattr(ldap_jobs.ldap3, "Connection", _FakeConnection)

    result = ldap_jobs.test_connection_job(db, {"server_uri": "ldap://pulp:80"})

    assert result["success"] is False
    assert "LDAP" in result["error"]


def test_test_connection_classifies_tcp_refused(db, monkeypatch):
    def _raise_refused(*args, **kwargs):
        raise communication_exception_factory(
            LDAPSocketOpenError, ConnectionRefusedError("Connection refused")
        )("connection refused")

    monkeypatch.setattr(ldap_jobs.ldap3, "Server", lambda uri, **kwargs: uri)
    monkeypatch.setattr(ldap_jobs.ldap3, "Connection", _raise_refused)

    result = ldap_jobs.test_connection_job(db, {"server_uri": "ldap://ldap.example.com:389"})

    assert result["success"] is False
    assert "TCP" in result["error"]


def test_test_connection_classifies_tls_certificate_failure(db, monkeypatch):
    def _raise_cert_error(*args, **kwargs):
        raise communication_exception_factory(
            LDAPSocketOpenError, ssl.SSLCertVerificationError("certificate verify failed")
        )("tls failed")

    monkeypatch.setattr(ldap_jobs.ldap3, "Server", lambda uri, **kwargs: uri)
    monkeypatch.setattr(ldap_jobs.ldap3, "Connection", _raise_cert_error)

    result = ldap_jobs.test_connection_job(
        db, {"server_uri": "ldaps://ldap.example.com:636"}
    )

    assert result["success"] is False
    assert "certificate" in result["error"].lower()


def test_test_connection_classifies_timeout(db, monkeypatch):
    def _raise_timeout(*args, **kwargs):
        raise communication_exception_factory(LDAPSocketOpenError, TimeoutError("timed out"))(
            "timed out"
        )

    monkeypatch.setattr(ldap_jobs.ldap3, "Server", lambda uri, **kwargs: uri)
    monkeypatch.setattr(ldap_jobs.ldap3, "Connection", _raise_timeout)

    result = ldap_jobs.test_connection_job(db, {"server_uri": "ldap://ldap.example.com:389"})

    assert result["success"] is False
    assert "timed out" in result["error"].lower()


def test_test_connection_reports_search_base_errors_distinctly_from_zero_matches(db, monkeypatch):
    """connection.search()'s own return value only distinguishes "matched
    something" from "didn't" (ldap3's raise_exceptions defaults to False) -
    a nonexistent search base and "zero real matches" must not be reported
    the same way."""

    class _FakeConnection:
        def __init__(self, *args, **kwargs):
            self.result = {"description": "success"}
            self.entries: list = []

        def bind(self):
            return True

        def search(self, base, filter_, *, search_scope, size_limit):
            self.result = {
                "result": RESULT_NO_SUCH_OBJECT,
                "description": "noSuchObject",
            }

        def unbind(self):
            pass

    monkeypatch.setattr(ldap_jobs.ldap3, "Server", lambda uri, **kwargs: uri)
    monkeypatch.setattr(ldap_jobs.ldap3, "Connection", _FakeConnection)

    result = ldap_jobs.test_connection_job(
        db,
        {
            "server_uri": "ldap://ldap.example.com:389",
            "user_search_base": "ou=missing,dc=example,dc=com",
            "user_search_filter": "(uid=%(user)s)",
        },
    )

    assert result["success"] is True
    assert result["user_search_matched"] is False
    assert "does not exist" in result["user_search_error"]


def test_test_connection_probes_group_search_and_require_group_dn(db, monkeypatch):
    calls = []

    class _FakeConnection:
        def __init__(self, *args, **kwargs):
            self.result = {"result": RESULT_SUCCESS, "description": "success"}
            self.entries = [object()]

        def bind(self):
            return True

        def search(self, base, filter_, *, search_scope, size_limit):
            calls.append((base, filter_, search_scope))
            self.result = {"result": RESULT_SUCCESS, "description": "success"}

        def unbind(self):
            pass

    monkeypatch.setattr(ldap_jobs.ldap3, "Server", lambda uri, **kwargs: uri)
    monkeypatch.setattr(ldap_jobs.ldap3, "Connection", _FakeConnection)

    result = ldap_jobs.test_connection_job(
        db,
        {
            "server_uri": "ldap://ldap.example.com:389",
            "group_search_base": "ou=groups,dc=example,dc=com",
            "group_search_filter": "(objectClass=groupOfNames)",
            "require_group_dn": "cn=pulp-users,ou=groups,dc=example,dc=com",
        },
    )

    assert result["success"] is True
    assert result["group_search_matched"] is True
    assert result["require_group_dn_exists"] is True
    assert calls[0] == (
        "ou=groups,dc=example,dc=com",
        "(objectClass=groupOfNames)",
        ldap_jobs.ldap3.SUBTREE,
    )
    assert calls[1] == (
        "cn=pulp-users,ou=groups,dc=example,dc=com",
        "(objectClass=*)",
        ldap_jobs.ldap3.BASE,
    )


_CA_CERT = "-----BEGIN CERTIFICATE-----\nMIIBfake\n-----END CERTIFICATE-----"


def _capture_tls(monkeypatch) -> dict:
    captured: dict = {}

    def _fake_tls(**kwargs):
        captured.update(kwargs)
        return "tls"

    monkeypatch.setattr(ldap_jobs.ldap3, "Tls", _fake_tls)
    # The real Server rejects anything but a real Tls instance.
    monkeypatch.setattr(ldap_jobs.ldap3, "Server", lambda uri, **kwargs: uri)
    return captured


def test_test_connection_trusts_the_saved_ca_cert(db, monkeypatch):
    service.update_settings(db, service.get_settings_row(db), {"ca_cert": _CA_CERT})
    db.commit()
    tls = _capture_tls(monkeypatch)

    ldap_jobs._build_test_server(service.get_settings_row(db), {})

    assert tls["validate"] == ssl.CERT_REQUIRED
    assert tls["ca_certs_data"] == _CA_CERT


def test_test_connection_blank_ca_cert_override_means_system_cas_only(db, monkeypatch):
    service.update_settings(db, service.get_settings_row(db), {"ca_cert": _CA_CERT})
    db.commit()
    tls = _capture_tls(monkeypatch)

    ldap_jobs._build_test_server(service.get_settings_row(db), {"ca_cert": ""})

    assert tls["ca_certs_data"] is None


def test_apply_config_manifest_carries_the_ca_cert(db):
    from app.modules.ldap.manifest import build_manifest

    row = service.update_settings(
        db, service.get_settings_row(db), {"enabled": True, "ca_cert": _CA_CERT}
    )

    assert build_manifest(row)["ca_cert"] == _CA_CERT
