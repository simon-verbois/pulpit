"""Pulp API adapter behavior, mocked at the HTTP boundary with respx -
docs/TESTING.md's mocking policy applied to pulpit-core: response shapes
mirror what docs/signing.md's live-verified research captured, not invented
fields."""

import httpx
import pytest
import respx

from app.adapters.pulp.client import PulpClient
from app.adapters.pulp.exceptions import PulpAdapterError, PulpNotFoundError
from app.core.config import Settings


@pytest.fixture
def client():
    return PulpClient(Settings(pulp_base_url="http://pulp-test", pulp_service_password="x"))


@respx.mock
def test_list_signing_services(client):
    respx.get("http://pulp-test/pulp/api/v3/signing-services/").mock(
        return_value=httpx.Response(
            200,
            json={
                "count": 1,
                "results": [
                    {
                        "pulp_href": "/pulp/api/v3/signing-services/abc/",
                        "name": "Pulp RPM Signing Service",
                        "public_key": "-----BEGIN PGP PUBLIC KEY BLOCK-----\n...",
                        "pubkey_fingerprint": "A" * 40,
                    }
                ],
            },
        )
    )
    results = client.list_signing_services()
    assert results[0]["name"] == "Pulp RPM Signing Service"


@respx.mock
def test_get_signing_service_by_name_not_found_returns_none(client):
    respx.get("http://pulp-test/pulp/api/v3/signing-services/").mock(
        return_value=httpx.Response(200, json={"count": 0, "results": []})
    )
    assert client.get_signing_service_by_name("does-not-exist") is None


@respx.mock
def test_update_rpm_repository_signing_sends_expected_fields(client):
    route = respx.patch("http://pulp-test/pulp/api/v3/repositories/rpm/rpm/abc/").mock(
        return_value=httpx.Response(200, json={"task": "/pulp/api/v3/tasks/xyz/"})
    )
    result = client.update_rpm_repository_signing(
        "/pulp/api/v3/repositories/rpm/rpm/abc/",
        package_signing_service="/pulp/api/v3/signing-services/pkg/",
        package_signing_fingerprint="B" * 40,
        metadata_signing_service=None,
    )
    assert result == {"task": "/pulp/api/v3/tasks/xyz/"}
    sent_body = route.calls.last.request.content
    import json

    body = json.loads(sent_body)
    assert body["package_signing_service"] == "/pulp/api/v3/signing-services/pkg/"
    assert body["package_signing_fingerprint"] == "B" * 40
    assert body["metadata_signing_service"] is None


@respx.mock
def test_get_rpm_repository_404_raises_not_found(client):
    respx.get("http://pulp-test/pulp/api/v3/repositories/rpm/rpm/missing/").mock(
        return_value=httpx.Response(404, json={"detail": "Not found."})
    )
    with pytest.raises(PulpNotFoundError):
        client.get_rpm_repository("/pulp/api/v3/repositories/rpm/rpm/missing/")


@respx.mock
def test_pulp_5xx_raises_adapter_error(client):
    respx.get("http://pulp-test/pulp/api/v3/signing-services/").mock(return_value=httpx.Response(502))
    with pytest.raises(PulpAdapterError):
        client.list_signing_services()


@respx.mock
def test_network_failure_raises_adapter_error(client):
    respx.get("http://pulp-test/pulp/api/v3/signing-services/").mock(
        side_effect=httpx.ConnectError("connection refused")
    )
    with pytest.raises(PulpAdapterError):
        client.list_signing_services()
