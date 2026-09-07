"""FreeIPA adapter behavior, mocked at the HTTP boundary with respx - see
app/adapters/freeipa/client.py's module docstring: the exact request/response
shapes are modeled from FreeIPA's documented API, not verified live, so
these tests exercise this client's own logic (cookie handling, error
surfacing, request shape) rather than claiming to confirm real FreeIPA
behavior."""

import httpx
import pytest
import respx

from app.adapters.freeipa.client import FreeIPAClient
from app.adapters.freeipa.exceptions import FreeIPAAdapterError, FreeIPAAuthError


@pytest.fixture
def client():
    return FreeIPAClient("https://ipa.example.test")


@respx.mock
def test_login_returns_the_session_cookie(client):
    respx.post("https://ipa.example.test/ipa/session/login_password").mock(
        return_value=httpx.Response(200, headers={"Set-Cookie": "ipa_session=abc123; Path=/"})
    )
    assert client.login("admin", "password") == "abc123"


@respx.mock
def test_login_raises_auth_error_on_non_200(client):
    respx.post("https://ipa.example.test/ipa/session/login_password").mock(
        return_value=httpx.Response(401, text="Invalid credentials")
    )
    with pytest.raises(FreeIPAAuthError):
        client.login("admin", "wrong-password")


@respx.mock
def test_login_raises_auth_error_when_no_cookie_returned(client):
    respx.post("https://ipa.example.test/ipa/session/login_password").mock(
        return_value=httpx.Response(200)
    )
    with pytest.raises(FreeIPAAuthError):
        client.login("admin", "password")


@respx.mock
def test_call_returns_the_result_payload(client):
    respx.post("https://ipa.example.test/ipa/session/json").mock(
        return_value=httpx.Response(200, json={"result": {"value": "service-1"}})
    )
    result = client.call("cookie-value", "service_add", ["HTTP/host@REALM"], {"force": True})
    assert result == {"value": "service-1"}


@respx.mock
def test_call_raises_adapter_error_on_rpc_error(client):
    respx.post("https://ipa.example.test/ipa/session/json").mock(
        return_value=httpx.Response(200, json={"error": {"message": "already exists"}})
    )
    with pytest.raises(FreeIPAAdapterError, match="already exists"):
        client.call("cookie-value", "service_add", ["HTTP/host@REALM"], {})


@respx.mock
def test_request_cert_sends_principal_ca_and_optional_profile(client):
    route = respx.post("https://ipa.example.test/ipa/session/json").mock(
        return_value=httpx.Response(200, json={"result": {"certificate": "MII...", "request_id": 42}})
    )
    result = client.request_cert(
        "cookie-value",
        csr_pem="-----BEGIN CERTIFICATE REQUEST-----\n...",
        principal="HTTP/pulpit.example.com@EXAMPLE.COM",
        ca="ipa",
        profile="caIPAserviceCert",
    )
    assert result["request_id"] == 42
    sent = route.calls.last.request.content
    assert b"HTTP/pulpit.example.com@EXAMPLE.COM" in sent
    assert b"caIPAserviceCert" in sent


@respx.mock
def test_change_password_raises_on_rejection_header(client):
    respx.post("https://ipa.example.test/ipa/session/change_password").mock(
        return_value=httpx.Response(200, headers={"X-IPA-Rejection-Reason": "old-password"})
    )
    with pytest.raises(FreeIPAAdapterError):
        client.change_password("svc-account", "temp", "new-permanent-password")


@respx.mock
def test_change_password_succeeds_with_no_rejection_header(client):
    respx.post("https://ipa.example.test/ipa/session/change_password").mock(
        return_value=httpx.Response(200)
    )
    client.change_password("svc-account", "temp", "new-permanent-password")
