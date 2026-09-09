import uuid
from datetime import UTC, datetime

import pytest
import respx
from fastapi.testclient import TestClient

from app.adapters.pulp.client import PulpClient
from app.adapters.pulp.exceptions import PulpAdapterError
from app.core.auth import CurrentUser, FullUser, get_full_user, require_authenticated_user
from app.core.config import Settings
from app.core.database import get_db
from app.main import app
from app.modules.signing.models import KeyState, SigningKey


@pytest.mark.parametrize("target", [
    "https://attacker.invalid/collect", "//attacker.invalid/", "http://pulp-test.evil/",
    "http://admin:secret@pulp-test/", "http://pulp-test:81/", "/\\evil/", "\nhttp://evil/",
])
def test_never_send_service_credentials_off_origin(target):
    client = PulpClient(Settings(pulp_base_url="http://pulp-test", pulp_service_password="fake"))
    with respx.mock(assert_all_called=False) as mock:
        with pytest.raises(PulpAdapterError):
            client.get_rpm_repository(target)
        assert len(mock.calls) == 0


@respx.mock
def test_public_distribution_download_uses_internal_origin():
    client = PulpClient(Settings(pulp_base_url="http://pulp-test", pulp_service_password="fake"))
    route = respx.get("http://pulp-test/pulp/content/example/repodata/repomd.xml").respond(200, content=b"metadata")
    assert client.get_content_bytes("https://public.example/pulp/content/example/repodata/repomd.xml") == b"metadata"
    assert route.called


@pytest.fixture
def reader(db):
    def database():
        yield db
    app.dependency_overrides[get_db] = database
    app.dependency_overrides[require_authenticated_user] = lambda: CurrentUser("reader", "/users/2/")
    app.dependency_overrides[get_full_user] = lambda: FullUser("reader", "/users/2/", False)
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


@pytest.mark.parametrize("method,path,body", [
    ("PATCH", "/api/v1/signing/settings", {"signing_enabled": False}),
    ("POST", "/api/v1/signing/keys/generate", {}),
    ("POST", f"/api/v1/signing/keys/{uuid.uuid4()}/publish", {}),
    ("POST", f"/api/v1/signing/keys/{uuid.uuid4()}/extend-expiration", {"additional_days": 30}),
])
def test_reader_cannot_manage_signing(reader, method, path, body):
    assert reader.request(method, path, json=body).status_code == 403


def test_external_repository_is_rejected_before_network(reader):
    with respx.mock(assert_all_called=False) as mock:
        response = reader.post("/api/v1/signing/repositories/configure", json={"repository_href": "https://evil.invalid/"})
        assert response.status_code == 422
        assert not mock.calls


@pytest.mark.parametrize("status", [403, 202, 200])
@respx.mock
def test_repository_patch_uses_caller_permissions_and_never_saves_credentials(reader, db, status):
    db.add(SigningKey(state=KeyState.ACTIVE, key_id="A" * 40, fingerprint="A" * 40,
                      identity_name="test", algorithm="rsa4096", public_key_armor="public", activated_at=datetime.now(UTC)))
    db.commit()
    href = f"/pulp/api/v3/repositories/rpm/rpm/{uuid.uuid4()}/"
    respx.get(f"http://pulp:80{href}").respond(200, json={})
    task_href = f"/pulp/api/v3/tasks/{uuid.uuid4()}/"
    route = respx.patch(f"http://pulp:80{href}").respond(status, json={"task": task_href} if status == 202 else {"detail": "Forbidden"} if status == 403 else {})
    response = reader.post("/api/v1/signing/repositories/configure", json={"repository_href": href, "sign_packages": False}, headers={"Authorization": "Basic cmVhZGVyOmZha2U="})
    assert response.status_code == (403 if status == 403 else 202)
    assert route.calls.last.request.headers["authorization"] == "Basic cmVhZGVyOmZha2U="
    if status in (200, 202):
        from app.core.jobs.models import Job
        job = db.get(Job, uuid.UUID(response.json()["id"]))
        assert job.payload == {"pulp_task": task_href if status == 202 else None}
        assert job.status == ("queued" if status == 202 else "success")


def test_legacy_privileged_size_endpoints_are_removed(reader):
    for suffix in ("sizes", "repository-sizes"):
        assert reader.get(f"/api/v1/content_size/{suffix}").status_code == 404


def test_ldap_requires_trusted_certificate_and_connect_timeout():
    import ssl

    from app.modules.ldap.jobs import _build_test_server
    from app.modules.ldap.models import LdapSettings
    row = LdapSettings(server_uri="ldaps://ldap.example", bind_dn="", bind_password_encrypted=None,
                       start_tls=False, user_search_base="", user_search_filter="")
    _, server = _build_test_server(row, {})
    assert server.tls.validate == ssl.CERT_REQUIRED
    assert server.connect_timeout > 0


def test_ldap_rejects_untrusted_live_tls_server(tmp_path):
    import socket
    import ssl
    import threading

    import ldap3

    from app.modules.ldap.jobs import _build_test_server
    from app.modules.ldap.models import LdapSettings
    from app.modules.tls.selfsigned import generate_selfsigned

    certificate = generate_selfsigned(common_name="localhost", validity_days=1)
    cert_path, key_path = tmp_path / "cert.pem", tmp_path / "key.pem"
    cert_path.write_text(certificate.cert_pem)
    key_path.write_text(certificate.key_pem)
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain(cert_path, key_path)
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        listener.listen()
        listener.settimeout(5)
        port = listener.getsockname()[1]
        def serve():
            try:
                connection, _ = listener.accept()
                with connection:
                    context.wrap_socket(connection, server_side=True).close()
            except (ssl.SSLError, OSError):
                pass  # The client must abort the untrusted handshake.
        thread = threading.Thread(target=serve, daemon=True)
        thread.start()
        row = LdapSettings(server_uri=f"ldaps://127.0.0.1:{port}", bind_dn="", bind_password_encrypted=None,
                           start_tls=False, user_search_base="", user_search_filter="")
        _, server = _build_test_server(row, {})
        connection = ldap3.Connection(server)
        try:
            with pytest.raises(ldap3.core.exceptions.LDAPSocketOpenError, match="CERTIFICATE_VERIFY_FAILED"):
                connection.open()
        finally:
            connection.unbind()
            thread.join(timeout=6)


@respx.mock
def test_repository_hidden_by_pulp_remains_not_found(reader, db):
    db.add(SigningKey(state=KeyState.ACTIVE, key_id="B" * 40, fingerprint="B" * 40,
                      identity_name="test", algorithm="rsa4096", public_key_armor="public"))
    db.commit()
    href = f"/pulp/api/v3/repositories/rpm/rpm/{uuid.uuid4()}/"
    respx.get(f"http://pulp:80{href}").respond(404, json={"detail": "Not found"})
    response = reader.post("/api/v1/signing/repositories/configure", json={"repository_href": href}, headers={"Authorization": "Basic cmVhZGVyOmZha2U="})
    assert response.status_code == 404
