"""The reconciler is a standalone script baked into the pulp image
(deployment/docker/pulp/pulpit-ldap-reconciler, no .py extension) - loaded
by path here so its settings rendering is covered without a pulp container."""

import importlib.machinery
import importlib.util
from pathlib import Path

import pytest

_SCRIPT = Path(__file__).resolve().parents[3] / "deployment/docker/pulp/pulpit-ldap-reconciler"

_CONFIG = {
    "enabled": True,
    "server_uri": "ldaps://ldap.example.com:636",
    "bind_dn": "cn=readonly,dc=example,dc=com",
    "bind_password": "s3cret",
    "start_tls": False,
    "user_search_base": "ou=people,dc=example,dc=com",
    "user_search_filter": "(uid=%(user)s)",
    "group_search_base": "ou=groups,dc=example,dc=com",
    "group_search_filter": "(objectClass=groupOfNames)",
    "group_type": "group_of_names",
    "require_group_dn": None,
    "mirror_groups": True,
    "attr_first_name": "givenName",
    "attr_last_name": "sn",
    "attr_email": "mail",
}
_CA_CERT = "-----BEGIN CERTIFICATE-----\nMIIBfake\n-----END CERTIFICATE-----"


@pytest.fixture
def reconciler(tmp_path, monkeypatch):
    if not _SCRIPT.exists():
        pytest.skip("deployment/ not available next to pulpit-core")
    loader = importlib.machinery.SourceFileLoader("pulpit_ldap_reconciler", str(_SCRIPT))
    spec = importlib.util.spec_from_loader(loader.name, loader)
    module = importlib.util.module_from_spec(spec)
    loader.exec_module(module)
    monkeypatch.setattr(module, "CA_CERT_PATH", str(tmp_path / "ca.pem"))
    return module


def test_renders_no_tls_options_without_a_ca_cert(reconciler):
    rendered = reconciler._render_settings({**_CONFIG, "ca_cert": None})
    assert "AUTH_LDAP_CONNECTION_OPTIONS" not in rendered
    compile(rendered, "settings.py", "exec")


def test_points_django_auth_ldap_at_the_ca_file(reconciler):
    rendered = reconciler._render_settings({**_CONFIG, "ca_cert": _CA_CERT})
    compile(rendered, "settings.py", "exec")
    options = rendered[rendered.index("AUTH_LDAP_CONNECTION_OPTIONS") :]
    assert f"ldap.OPT_X_TLS_CACERTFILE: {reconciler.CA_CERT_PATH!r}" in options
    # NEWCTX must be the last option set, or the others never take effect.
    assert options.index("OPT_X_TLS_NEWCTX") > options.index("OPT_X_TLS_CACERTFILE")


def test_writes_and_removes_the_ca_file(reconciler):
    ca_path = Path(reconciler.CA_CERT_PATH)

    reconciler._sync_ca_cert({**_CONFIG, "ca_cert": _CA_CERT})
    assert ca_path.read_text() == _CA_CERT + "\n"
    assert ca_path.stat().st_mode & 0o777 == 0o644

    reconciler._sync_ca_cert({"enabled": False})
    assert not ca_path.exists()
