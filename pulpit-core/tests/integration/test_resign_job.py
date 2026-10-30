"""Native Pulp signing preparation; never publish unsigned bytes to fetch them."""

import httpx
import pytest
import respx

from app.modules.signing.jobs import _needs_signing, resign_repository_packages_job
from app.modules.signing.models import RepositorySigningSyncState

REPO = "/pulp/api/v3/repositories/rpm/rpm/repo/"
FP = "A" * 40


def setup_pulp(*, signed=False, preparation="completed", publication="completed", supported=True, autopublish=False):
    respx.get("http://pulp:80/pulp/api/v3/status/").respond(200, json={"versions": [
        {"component": "pulp_rpm_signing_policy" if supported else "rpm", "version": "1.0.0"}]})
    state = {"prepared": False}
    respx.get(f"http://pulp:80{REPO}").mock(side_effect=lambda request: httpx.Response(200, json={
        "pulp_href": REPO, "autopublish": autopublish, "latest_version_href": f"{REPO}versions/{2 if state['prepared'] else 1}/",
        "package_signing_service": "/pulp/api/v3/signing-services/service/",
        "package_signing_fingerprint": f"v4:{FP}",
    }))
    respx.get("http://pulp:80/pulp/api/v3/content/rpm/packages/").mock(
        side_effect=lambda request: httpx.Response(200, json={"next": None, "results": [
            {"pulp_href": "/pulp/api/v3/content/rpm/packages/pkg/", "signing_keys":
                [f"v4:{FP}"] if signed or state["prepared"] else None}]}))

    def modify(request):
        state["prepared"] = preparation == "completed"
        return httpx.Response(202, json={"task": "/pulp/api/v3/tasks/prepare/"})

    modification = respx.post(f"http://pulp:80{REPO}modify/").mock(side_effect=modify)
    respx.get("http://pulp:80/pulp/api/v3/tasks/prepare/").respond(200, json={"state": preparation})
    publish = respx.post("http://pulp:80/pulp/api/v3/publications/rpm/rpm/").respond(
        202, json={"task": "/pulp/api/v3/tasks/publish/"})
    respx.get("http://pulp:80/pulp/api/v3/tasks/publish/").respond(200, json={"state": publication})
    return modification, publish


@respx.mock
def test_signs_before_publication_without_distribution(db):
    modification, publication = setup_pulp()
    result = resign_repository_packages_job(db, {"repository_href": REPO, "fingerprint": FP})
    assert result["signed"] == 1
    assert result["engine"] == "pulp"
    import json
    assert json.loads(modification.calls.last.request.content) == {}
    assert publication.call_count == 1
    assert db.query(RepositorySigningSyncState).one().last_processed_version == 2
    paths = [call.request.url.path for call in respx.calls]
    assert not any("/distributions/" in path or "/pulp/content/" in path for path in paths)
    assert paths.index(f"{REPO}modify/") < paths.index("/pulp/api/v3/publications/rpm/rpm/")


@respx.mock
def test_already_signed_content_does_not_republish(db):
    modification, publication = setup_pulp(signed=True)
    result = resign_repository_packages_job(db, {"repository_href": REPO, "fingerprint": FP})
    assert result["signed"] == 0
    assert not modification.called
    assert not publication.called


@respx.mock
def test_explicit_metadata_refresh_waits_for_publication(db):
    modification, publication = setup_pulp(signed=True)
    resign_repository_packages_job(db, {"repository_href": REPO, "fingerprint": FP, "force_publish": True})
    assert not modification.called
    assert publication.called
    assert respx.get("http://pulp:80/pulp/api/v3/tasks/publish/").called


@pytest.mark.parametrize("stage", ["preparation", "publication"])
@respx.mock
def test_a_failed_pulp_task_does_not_advance_watermark(db, stage):
    _, publication = setup_pulp(**{stage: "failed"})
    with pytest.raises(ValueError, match="failed"):
        resign_repository_packages_job(db, {"repository_href": REPO, "fingerprint": FP})
    assert db.query(RepositorySigningSyncState).count() == 0
    if stage == "preparation":
        assert not publication.called


@respx.mock
def test_missing_plugin_fails_without_unsafe_fallback(db):
    modification, publication = setup_pulp(supported=False)
    with pytest.raises(ValueError, match="signing-policy plugin"):
        resign_repository_packages_job(db, {"repository_href": REPO, "fingerprint": FP})
    assert not modification.called
    assert not publication.called


@respx.mock
def test_configuration_failure_stops_preparation(db):
    modification, publication = setup_pulp()
    respx.get("http://pulp:80/pulp/api/v3/tasks/configure/").respond(200, json={"state": "failed"})
    with pytest.raises(ValueError, match="configuration failed"):
        resign_repository_packages_job(db, {"repository_href": REPO, "fingerprint": FP,
            "configure_task": "/pulp/api/v3/tasks/configure/"})
    assert not modification.called
    assert not publication.called


@pytest.mark.parametrize("keys,expected", [
    (None, True), ([], True), ([f"v4:{FP}"], False), ([FP.lower()], False),
    ([f"keyid:{FP[-16:]}"], False), (["v4:" + "B" * 40], True),
])
def test_fingerprint_formats(keys, expected):
    assert _needs_signing({"signing_keys": keys}, FP) is expected


@respx.mock
def test_native_autopublish_is_not_followed_by_a_duplicate_publication(db):
    modification, publication = setup_pulp(autopublish=True)
    resign_repository_packages_job(db, {"repository_href": REPO, "fingerprint": FP, "force_publish": True})
    assert modification.called
    assert not publication.called
