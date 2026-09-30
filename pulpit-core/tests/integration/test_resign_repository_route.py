"""POST /signing/repositories/resign - the per-repository "Re-sign" action.
The caller's own credentials PATCH the repository's signing fields first
(Pulp's object permissions decide), and only then is a full resign pass
queued for the worker. respx-mocked Pulp boundary, real test database."""

import uuid
from datetime import UTC, datetime

import pytest
import respx
from fastapi.testclient import TestClient

from app.core.auth import CurrentUser, require_authenticated_user
from app.core.database import get_db
from app.core.jobs.models import Job, JobStatus
from app.core.jobs.service import enqueue_job
from app.main import app
from app.modules.signing import service
from app.modules.signing.models import (
    KeyState,
    PulpServicePurpose,
    PulpServiceStatus,
    SigningKey,
    SigningPulpService,
)

FINGERPRINT = "C" * 40
PACKAGE_SERVICE_HREF = "/pulp/api/v3/signing-services/pkg/"
METADATA_SERVICE_HREF = "/pulp/api/v3/signing-services/meta/"
AUTH = {"Authorization": "Basic cmVhZGVyOmZha2U="}


@pytest.fixture
def client(db):
    def database():
        yield db
    app.dependency_overrides[get_db] = database
    app.dependency_overrides[require_authenticated_user] = lambda: CurrentUser("reader", "/users/2/")
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


@pytest.fixture
def repo_href():
    return f"/pulp/api/v3/repositories/rpm/rpm/{uuid.uuid4()}/"


def _enable(db, *, packages: bool, metadata: bool):
    settings_row = service.get_settings_row(db)
    settings_row.package_signing_enabled = packages
    settings_row.metadata_signing_enabled = metadata
    key = SigningKey(state=KeyState.ACTIVE, key_id=FINGERPRINT, fingerprint=FINGERPRINT, identity_name="test",
                     algorithm="rsa4096", public_key_armor="public", activated_at=datetime.now(UTC))
    db.add(key)
    db.flush()
    db.add(SigningPulpService(purpose=PulpServicePurpose.PACKAGE, signing_key_id=key.id, name="pkg",
                              pulp_href=PACKAGE_SERVICE_HREF, status=PulpServiceStatus.ACTIVE,
                              fingerprint=FINGERPRINT, bootstrap_command=""))
    db.add(SigningPulpService(purpose=PulpServicePurpose.METADATA, signing_key_id=key.id, name="meta",
                              pulp_href=METADATA_SERVICE_HREF, status=PulpServiceStatus.ACTIVE,
                              fingerprint=FINGERPRINT, bootstrap_command=""))
    db.commit()


def _mock_repo(href, patch_status=202):
    respx.get(f"http://pulp:80{href}").respond(200, json={"pulp_href": href})
    body = {"task": "/pulp/api/v3/tasks/cfg/"} if patch_status == 202 else {"detail": "nope"}
    return respx.patch(f"http://pulp:80{href}").respond(patch_status, json=body)


def test_rejects_when_signing_is_not_enabled(client, db, repo_href):
    response = client.post("/api/v1/signing/repositories/resign", json={"repository_href": repo_href})
    assert response.status_code == 409


def test_rejects_an_external_href_before_any_network_call(client):
    with respx.mock(assert_all_called=False) as mock:
        response = client.post("/api/v1/signing/repositories/resign", json={"repository_href": "https://evil.invalid/"})
    assert response.status_code == 422
    assert not mock.calls


@respx.mock
def test_queues_a_full_resign_behind_the_callers_configuration_patch(client, db, repo_href):
    _enable(db, packages=True, metadata=True)
    patch = _mock_repo(repo_href)

    response = client.post("/api/v1/signing/repositories/resign", json={"repository_href": repo_href}, headers=AUTH)

    assert response.status_code == 202
    assert patch.calls.last.request.headers["authorization"] == AUTH["Authorization"]
    job = db.get(Job, uuid.UUID(response.json()["id"]))
    assert job.job_type == "signing.resign_repository_packages"
    assert job.requested_by == "reader"
    # No since_version: a full pass over every package, not an incremental one.
    assert job.payload == {
        "repository_href": repo_href, "fingerprint": FINGERPRINT, "configure_task": "/pulp/api/v3/tasks/cfg/",
    }


@respx.mock
def test_a_caller_pulp_refuses_gets_no_job(client, db, repo_href):
    _enable(db, packages=True, metadata=False)
    _mock_repo(repo_href, patch_status=403)

    response = client.post("/api/v1/signing/repositories/resign", json={"repository_href": repo_href}, headers=AUTH)

    assert response.status_code == 403
    assert db.query(Job).filter_by(job_type="signing.resign_repository_packages").count() == 0


@respx.mock
def test_a_queued_incremental_job_is_widened_to_a_full_pass_not_duplicated(client, db, repo_href):
    _enable(db, packages=True, metadata=False)
    _mock_repo(repo_href)
    existing = enqueue_job(db, "signing.resign_repository_packages", {
        "repository_href": repo_href, "fingerprint": FINGERPRINT,
        "since_version": f"{repo_href}versions/3/", "target_version": f"{repo_href}versions/4/",
    })
    db.commit()

    response = client.post("/api/v1/signing/repositories/resign", json={"repository_href": repo_href}, headers=AUTH)

    assert response.status_code == 202
    assert response.json()["id"] == str(existing.id)
    db.refresh(existing)
    assert existing.status == JobStatus.QUEUED
    assert "since_version" not in existing.payload
    assert existing.payload["configure_task"] == "/pulp/api/v3/tasks/cfg/"
    assert db.query(Job).filter_by(job_type="signing.resign_repository_packages").count() == 1


@respx.mock
def test_metadata_only_policy_queues_a_republish(client, db, repo_href):
    _enable(db, packages=False, metadata=True)
    _mock_repo(repo_href)

    response = client.post("/api/v1/signing/repositories/resign", json={"repository_href": repo_href}, headers=AUTH)

    assert response.status_code == 202
    job = db.get(Job, uuid.UUID(response.json()["id"]))
    assert job.job_type == "signing.publish_repository_metadata"
    assert job.payload == {"repository_href": repo_href, "configure_task": "/pulp/api/v3/tasks/cfg/"}
