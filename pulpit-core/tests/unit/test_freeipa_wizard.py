"""FreeIPA setup wizard orchestration - FreeIPAClient itself is faked here
(see freeipa_wizard.py's own docstring on why the exact IPA RPC shapes
aren't verified live); these tests exercise the wizard's own step
sequencing and error handling, not real FreeIPA behavior."""

import pytest

from app.adapters.freeipa.exceptions import FreeIPAAdapterError
from app.modules.tls import freeipa_wizard

EXPECTED_STEP_ORDER = [
    "service_add",
    "user_add",
    "change_password",
    "privilege_add",
    "privilege_add_permission",
    "role_add",
    "role_add_privilege",
    "role_add_member",
    "caacl_add",
    "caacl_add_service",
    "caacl_add_profile",
    "caacl_add_ca",
]


class FakeFreeIPAClient:
    """`fail_on` maps a call method name to the FreeIPAAdapterError message
    it should raise instead of succeeding - "login" and "change_password"
    are also valid keys, covering every network call the wizard makes."""

    def __init__(self, base_url, *, verify_tls=True, timeout=30.0, fail_on: dict | None = None):
        self.base_url = base_url
        self.fail_on = fail_on or {}
        self.calls: list[str] = []

    def login(self, username, password):
        if "login" in self.fail_on:
            raise FreeIPAAdapterError(self.fail_on["login"])
        return "session-cookie"

    def call(self, session_cookie, method, args=None, kwargs=None):
        self.calls.append(method)
        if method in self.fail_on:
            raise FreeIPAAdapterError(self.fail_on[method])
        return {}

    def change_password(self, username, old_password, new_password):
        self.calls.append("change_password")
        if "change_password" in self.fail_on:
            raise FreeIPAAdapterError(self.fail_on["change_password"])


@pytest.fixture
def make_client(monkeypatch):
    """Returns a factory: call it with `fail_on={...}` to control which
    step fails and how; returns the FakeFreeIPAClient instance the wizard
    actually used, once run_wizard_setup has been called."""
    holder: dict = {}

    def _install(fail_on: dict | None = None):
        def _factory(base_url, **kwargs):
            instance = FakeFreeIPAClient(base_url, fail_on=fail_on, **kwargs)
            holder["instance"] = instance
            return instance

        monkeypatch.setattr(freeipa_wizard, "FreeIPAClient", _factory)
        return holder

    return _install


def _run(**overrides):
    kwargs = {
        "base_url": "https://ipa.example.test",
        "verify_tls": True,
        "admin_username": "admin",
        "admin_password": "admin-password",
        "common_name": "pulpit.example.com",
        "target_principal": "HTTP/pulpit.example.com@EXAMPLE.COM",
        "service_account_username": "svc-pulpit-tls",
        "ca": "ipa",
        "profile": None,
    }
    kwargs.update(overrides)
    return freeipa_wizard.run_wizard_setup(**kwargs)


def test_happy_path_completes_every_step_in_order_and_returns_a_password(make_client):
    holder = make_client()

    success, steps, password = _run()

    assert success is True
    assert password is not None
    assert [s["status"] for s in steps] == ["created"] * len(steps)
    assert holder["instance"].calls == EXPECTED_STEP_ORDER


def test_admin_login_failure_stops_immediately_with_no_password(make_client):
    make_client(fail_on={"login": "bad credentials"})

    success, steps, password = _run()

    assert success is False
    assert password is None
    assert len(steps) == 1
    assert steps[0]["status"] == "failed"


def test_existing_service_is_reported_as_already_exists_and_the_wizard_continues(make_client):
    holder = make_client(fail_on={"service_add": "service already exists"})

    success, steps, password = _run()

    assert success is True
    assert password is not None
    service_step = next(s for s in steps if s["step"].startswith("Create service"))
    assert service_step["status"] == "already_exists"
    # Every later step still ran despite the "already exists" on the first.
    assert holder["instance"].calls[1:] == EXPECTED_STEP_ORDER[1:]


def test_automation_account_creation_failure_stops_before_any_password_change(make_client):
    holder = make_client(fail_on={"user_add": "already taken"})

    success, steps, password = _run()

    assert success is False
    assert password is None
    assert "change_password" not in holder["instance"].calls


def test_a_failure_after_the_password_is_set_still_returns_it_so_it_can_be_saved(make_client):
    """Once the automation account's permanent password has been set on the
    IPA side, the wizard must still hand it back even if a LATER step (e.g.
    granting the permission) fails - otherwise the account would be left
    with a password nobody on the Pulpit side knows."""
    holder = make_client(fail_on={"privilege_add_permission": "unknown permission"})

    success, steps, password = _run()

    assert success is False
    assert password is not None
    assert "change_password" in holder["instance"].calls
