"""publish_key_job's mandatory follow-through (task requirement: publishing
a key always schedules resigning/republishing for every affected
repository - "c'est pas une option désactivable"). Pulp itself is
respx-mocked; the actual resign/publish jobs are NOT run here (they're
covered separately in test_resign_job.py) - this only checks that the right
jobs get enqueued for the right repositories."""

import httpx
import respx

from app.core.jobs.models import Job
from app.modules.signing import jobs as signing_jobs
from app.modules.signing import service
from app.modules.signing.models import KeyState, PulpServicePurpose, PulpServiceStatus, SigningPulpService

PACKAGE_SERVICE_HREF = "/pulp/api/v3/signing-services/pkg/"
METADATA_SERVICE_HREF = "/pulp/api/v3/signing-services/meta/"
REPO_HREF = "/pulp/api/v3/repositories/rpm/rpm/repo1/"


def _make_key(db, *, state=KeyState.NEXT, fingerprint="B" * 40):
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


@respx.mock
def test_publish_key_job_enqueues_resign_for_repos_using_the_package_service(db):
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

    respx.get("http://pulp:80/pulp/api/v3/repositories/rpm/rpm/", params={"limit": 100, "offset": 0}).mock(
        return_value=httpx.Response(
            200,
            json={
                "results": [
                    {
                        "pulp_href": REPO_HREF,
                        "package_signing_service": PACKAGE_SERVICE_HREF,
                        "metadata_signing_service": None,
                    },
                    {
                        "pulp_href": "/pulp/api/v3/repositories/rpm/rpm/unrelated/",
                        "package_signing_service": None,
                        "metadata_signing_service": None,
                    },
                ],
                "next": None,
            },
        )
    )
    respx.patch(f"http://pulp:80{REPO_HREF}").mock(
        return_value=httpx.Response(200, json={"task": "/pulp/api/v3/tasks/x/"})
    )

    result = signing_jobs.publish_key_job(db, {"key_id": str(key.id), "triggered_by": "manual"})

    assert result["status"] == "published"
    assert result["repositories_resigning"] == 1

    queued = db.query(Job).filter(Job.job_type == "signing.resign_repository_packages").all()
    assert len(queued) == 1
    assert queued[0].payload == {"repository_href": REPO_HREF, "fingerprint": key.fingerprint}
    # The unrelated repo never gets touched.
    republish_hrefs = {
        j.payload["repository_href"]
        for j in db.query(Job).filter(Job.job_type == "signing.publish_repository_metadata").all()
    }
    assert "unrelated" not in "".join(republish_hrefs)


@respx.mock
def test_publish_key_job_enqueues_metadata_republish_without_resign_for_metadata_only_repos(db):
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

    # No old_active key exists yet (bootstrap case) so _repoint_metadata_service's
    # old_href is None - nothing to repoint from, but a fresh publish still
    # has nothing to enqueue since no repository points at METADATA_SERVICE_HREF
    # yet. Simulate the more realistic "already pointed at an old service"
    # case instead by pre-creating an old active key + repo pointing at it.
    from app.modules.signing.models import SigningKey

    old_key = SigningKey(
        state=KeyState.ACTIVE,
        key_id="OLDKEYID",
        fingerprint="C" * 40,
        identity_name="Test",
        algorithm="rsa4096",
        public_key_armor="-----BEGIN PGP PUBLIC KEY BLOCK-----\nold\n-----END PGP PUBLIC KEY BLOCK-----\n",
    )
    db.add(old_key)
    db.flush()
    old_metadata_href = "/pulp/api/v3/signing-services/meta-old/"
    db.add(
        SigningPulpService(
            purpose=PulpServicePurpose.METADATA,
            signing_key_id=old_key.id,
            name="Pulp Metadata Signing Service (OLDKEYID)",
            status=PulpServiceStatus.ACTIVE,
            fingerprint=old_key.fingerprint,
            pulp_href=old_metadata_href,
            bootstrap_command="pulpcore-manager add-signing-service ...",
        )
    )
    db.flush()

    respx.get("http://pulp:80/pulp/api/v3/repositories/rpm/rpm/", params={"limit": 100, "offset": 0}).mock(
        return_value=httpx.Response(
            200,
            json={
                "results": [
                    {
                        "pulp_href": REPO_HREF,
                        "package_signing_service": None,
                        "package_signing_fingerprint": None,
                        "metadata_signing_service": old_metadata_href,
                    }
                ],
                "next": None,
            },
        )
    )
    respx.patch(f"http://pulp:80{REPO_HREF}").mock(
        return_value=httpx.Response(200, json={"task": "/pulp/api/v3/tasks/x/"})
    )

    result = signing_jobs.publish_key_job(db, {"key_id": str(key.id), "triggered_by": "manual"})

    assert result["repositories_resigning"] == 0
    resign_jobs = db.query(Job).filter(Job.job_type == "signing.resign_repository_packages").all()
    assert len(resign_jobs) == 0
    republish_jobs = db.query(Job).filter(Job.job_type == "signing.publish_repository_metadata").all()
    assert len(republish_jobs) == 1
    assert republish_jobs[0].payload == {"repository_href": REPO_HREF}
