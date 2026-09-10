"""apply_signing_to_all_repositories_job - the manual "bring every existing
RPM repository into line with the current signing policy" sweep. Same
respx-mocking approach as test_publish_key_job.py; the actual resign/publish
jobs are NOT run here (covered in test_resign_job.py) - this only checks
which repositories get PATCHed and which follow-up jobs get enqueued."""

import httpx
import respx

from app.core.jobs.models import Job
from app.modules.signing import jobs as signing_jobs
from app.modules.signing import service
from app.modules.signing.models import (
    KeyState,
    PulpServicePurpose,
    PulpServiceStatus,
    RepositorySigningSyncState,
    SigningPulpService,
)

PACKAGE_SERVICE_HREF = "/pulp/api/v3/signing-services/pkg/"
METADATA_SERVICE_HREF = "/pulp/api/v3/signing-services/meta/"
REPO_HREF = "/pulp/api/v3/repositories/rpm/rpm/repo1/"
ALREADY_SIGNED_REPO_HREF = "/pulp/api/v3/repositories/rpm/rpm/repo2/"


def _make_key(db, *, state=KeyState.ACTIVE, fingerprint="B" * 40):
    from app.modules.signing.models import SigningKey

    key = SigningKey(
        state=state,
        key_id="KEYID",
        fingerprint=fingerprint,
        identity_name="Test",
        algorithm="rsa4096",
        public_key_armor="-----BEGIN PGP PUBLIC KEY BLOCK-----\nx\n-----END PGP PUBLIC KEY BLOCK-----\n",
    )
    db.add(key)
    db.flush()
    return key


def test_returns_early_with_no_active_key(db):
    result = signing_jobs.apply_signing_to_all_repositories_job(db, {})

    assert result["skipped_reason"] == "no_active_key"
    assert result["updated_count"] == 0


@respx.mock
def test_patches_only_repositories_not_already_using_the_active_package_service(db):
    settings_row = service.get_settings_row(db)
    settings_row.package_signing_enabled = True
    db.flush()

    key = _make_key(db)
    db.add(
        SigningPulpService(
            purpose=PulpServicePurpose.PACKAGE,
            signing_key_id=key.id,
            name="Pulp RPM Signing Service",
            status=PulpServiceStatus.ACTIVE,
            fingerprint=key.fingerprint,
            pulp_href=PACKAGE_SERVICE_HREF,
            bootstrap_command="pulpcore-manager add-signing-service ...",
        )
    )
    db.flush()

    respx.get(
        "http://pulp:80/pulp/api/v3/repositories/rpm/rpm/", params={"limit": 100, "offset": 0}
    ).mock(
        return_value=httpx.Response(
            200,
            json={
                "results": [
                    {
                        "pulp_href": REPO_HREF,
                        "name": "repo1",
                        "package_signing_service": None,
                        "package_signing_fingerprint": None,
                        "metadata_signing_service": None,
                    },
                    {
                        "pulp_href": ALREADY_SIGNED_REPO_HREF,
                        "name": "repo2",
                        "package_signing_service": PACKAGE_SERVICE_HREF,
                        "package_signing_fingerprint": key.fingerprint,
                        "metadata_signing_service": None,
                    },
                ],
                "next": None,
            },
        )
    )
    patch_route = respx.patch(f"http://pulp:80{REPO_HREF}").mock(
        return_value=httpx.Response(200, json={"task": "/pulp/api/v3/tasks/x/"})
    )

    result = signing_jobs.apply_signing_to_all_repositories_job(db, {})

    assert result["updated_count"] == 1
    assert result["updated"] == [REPO_HREF]
    assert result["resigning_count"] == 1
    assert patch_route.called
    # The already-correctly-signed repo is never PATCHed.
    assert patch_route.call_count == 1

    resign_jobs = db.query(Job).filter(Job.job_type == "signing.resign_repository_packages").all()
    assert len(resign_jobs) == 1
    assert resign_jobs[0].payload == {"repository_href": REPO_HREF, "fingerprint": key.fingerprint}


@respx.mock
def test_metadata_only_repo_gets_republished_not_resigned(db):
    settings_row = service.get_settings_row(db)
    settings_row.metadata_signing_enabled = True
    db.flush()

    key = _make_key(db)
    db.add(
        SigningPulpService(
            purpose=PulpServicePurpose.METADATA,
            signing_key_id=key.id,
            name="Pulp Metadata Signing Service (KEYID)",
            status=PulpServiceStatus.ACTIVE,
            fingerprint=key.fingerprint,
            pulp_href=METADATA_SERVICE_HREF,
            bootstrap_command="pulpcore-manager add-signing-service ...",
        )
    )
    db.flush()

    respx.get(
        "http://pulp:80/pulp/api/v3/repositories/rpm/rpm/", params={"limit": 100, "offset": 0}
    ).mock(
        return_value=httpx.Response(
            200,
            json={
                "results": [
                    {
                        "pulp_href": REPO_HREF,
                        "name": "repo1",
                        "package_signing_service": None,
                        "package_signing_fingerprint": None,
                        "metadata_signing_service": None,
                    }
                ],
                "next": None,
            },
        )
    )
    respx.patch(f"http://pulp:80{REPO_HREF}").mock(
        return_value=httpx.Response(200, json={"task": "/pulp/api/v3/tasks/x/"})
    )

    result = signing_jobs.apply_signing_to_all_repositories_job(db, {})

    assert result["updated_count"] == 1
    assert result["resigning_count"] == 0
    assert result["republishing_count"] == 1
    assert db.query(Job).filter(Job.job_type == "signing.resign_repository_packages").count() == 0
    republish_jobs = db.query(Job).filter(Job.job_type == "signing.publish_repository_metadata").all()
    assert len(republish_jobs) == 1
    assert republish_jobs[0].payload == {"repository_href": REPO_HREF}


@respx.mock
def test_a_correctly_configured_repository_with_unresigned_content_still_gets_a_resign_job(db):
    """Task bug fix: config conformance (`package_signing_service` already
    pointed at the right service) is NOT the same as content conformance -
    a repository that has never actually had its packages resigned (no
    `signing_repository_sync_state` row at all) must still be selected,
    even though its Pulp fields need no PATCH."""
    settings_row = service.get_settings_row(db)
    settings_row.package_signing_enabled = True
    db.flush()

    key = _make_key(db)
    db.add(
        SigningPulpService(
            purpose=PulpServicePurpose.PACKAGE,
            signing_key_id=key.id,
            name="Pulp RPM Signing Service",
            status=PulpServiceStatus.ACTIVE,
            fingerprint=key.fingerprint,
            pulp_href=PACKAGE_SERVICE_HREF,
            bootstrap_command="pulpcore-manager add-signing-service ...",
        )
    )
    db.flush()

    respx.get(
        "http://pulp:80/pulp/api/v3/repositories/rpm/rpm/", params={"limit": 100, "offset": 0}
    ).mock(
        return_value=httpx.Response(
            200,
            json={
                "results": [
                    {
                        "pulp_href": REPO_HREF,
                        "name": "repo1",
                        "package_signing_service": PACKAGE_SERVICE_HREF,
                        "package_signing_fingerprint": key.fingerprint,
                        "metadata_signing_service": None,
                        "latest_version_href": f"{REPO_HREF}versions/5/",
                    }
                ],
                "next": None,
            },
        )
    )
    patch_route = respx.patch(f"http://pulp:80{REPO_HREF}")

    result = signing_jobs.apply_signing_to_all_repositories_job(db, {})

    # Already correctly configured - no PATCH needed...
    assert result["updated_count"] == 0
    assert not patch_route.called
    # ...but content was never resigned, so it's still selected.
    assert result["resigning_count"] == 1
    resign_jobs = db.query(Job).filter(Job.job_type == "signing.resign_repository_packages").all()
    assert len(resign_jobs) == 1
    assert resign_jobs[0].payload == {"repository_href": REPO_HREF, "fingerprint": key.fingerprint}


@respx.mock
def test_a_repository_already_caught_up_via_sync_state_is_left_alone(db):
    """The counterpart to the test above: once a resign run has covered a
    repository's current content (its sync-state watermark matches
    latest_version_href), re-running apply-to-all must be a true no-op -
    it must not resign every RPM every time (task requirement)."""
    settings_row = service.get_settings_row(db)
    settings_row.package_signing_enabled = True
    db.flush()

    key = _make_key(db)
    db.add(
        SigningPulpService(
            purpose=PulpServicePurpose.PACKAGE,
            signing_key_id=key.id,
            name="Pulp RPM Signing Service",
            status=PulpServiceStatus.ACTIVE,
            fingerprint=key.fingerprint,
            pulp_href=PACKAGE_SERVICE_HREF,
            bootstrap_command="pulpcore-manager add-signing-service ...",
        )
    )
    db.add(RepositorySigningSyncState(repository_href=REPO_HREF, last_processed_version=5))
    db.flush()

    respx.get(
        "http://pulp:80/pulp/api/v3/repositories/rpm/rpm/", params={"limit": 100, "offset": 0}
    ).mock(
        return_value=httpx.Response(
            200,
            json={
                "results": [
                    {
                        "pulp_href": REPO_HREF,
                        "name": "repo1",
                        "package_signing_service": PACKAGE_SERVICE_HREF,
                        "package_signing_fingerprint": key.fingerprint,
                        "metadata_signing_service": None,
                        "latest_version_href": f"{REPO_HREF}versions/5/",
                    }
                ],
                "next": None,
            },
        )
    )
    patch_route = respx.patch(f"http://pulp:80{REPO_HREF}")

    result = signing_jobs.apply_signing_to_all_repositories_job(db, {})

    assert result["updated_count"] == 0
    assert result["resigning_count"] == 0
    assert not patch_route.called
    assert db.query(Job).filter(Job.job_type == "signing.resign_repository_packages").count() == 0


@respx.mock
def test_a_pulp_failure_on_one_repository_does_not_abort_the_rest(db):
    settings_row = service.get_settings_row(db)
    settings_row.package_signing_enabled = True
    db.flush()

    key = _make_key(db)
    db.add(
        SigningPulpService(
            purpose=PulpServicePurpose.PACKAGE,
            signing_key_id=key.id,
            name="Pulp RPM Signing Service",
            status=PulpServiceStatus.ACTIVE,
            fingerprint=key.fingerprint,
            pulp_href=PACKAGE_SERVICE_HREF,
            bootstrap_command="pulpcore-manager add-signing-service ...",
        )
    )
    db.flush()

    other_href = "/pulp/api/v3/repositories/rpm/rpm/repo-fails/"
    respx.get(
        "http://pulp:80/pulp/api/v3/repositories/rpm/rpm/", params={"limit": 100, "offset": 0}
    ).mock(
        return_value=httpx.Response(
            200,
            json={
                "results": [
                    {
                        "pulp_href": other_href,
                        "name": "repo-fails",
                        "package_signing_service": None,
                        "package_signing_fingerprint": None,
                        "metadata_signing_service": None,
                    },
                    {
                        "pulp_href": REPO_HREF,
                        "name": "repo1",
                        "package_signing_service": None,
                        "package_signing_fingerprint": None,
                        "metadata_signing_service": None,
                    },
                ],
                "next": None,
            },
        )
    )
    respx.patch(f"http://pulp:80{other_href}").mock(return_value=httpx.Response(500))
    respx.patch(f"http://pulp:80{REPO_HREF}").mock(
        return_value=httpx.Response(200, json={"task": "/pulp/api/v3/tasks/x/"})
    )

    result = signing_jobs.apply_signing_to_all_repositories_job(db, {})

    assert result["updated_count"] == 1
    assert result["updated"] == [REPO_HREF]
    assert len(result["failed"]) == 1
    assert result["failed"][0]["repository"] == "repo-fails"
