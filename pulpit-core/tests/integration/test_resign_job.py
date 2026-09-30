"""Orchestration of the mandatory package-resign job (task requirement:
publishing a key always resigns already-existing packages, not an option),
and its incremental/idempotent/parallel behavior (docs/signing.md
"Incremental resigning after sync"): cache hits skip re-signing entirely,
a since_version/target_version payload scopes candidates to a repository
version delta instead of the whole repository, and a failed package never
silently advances the repository's sync-state watermark. The actual
`rpmsign` call is monkeypatched (this venv doesn't necessarily have
`rpmsign` installed - the real binary is only guaranteed inside the
pulpit-worker image); everything else here is real orchestration logic
against a respx-mocked Pulp HTTP boundary and a real (test) database,
matching this project's mocking policy."""

import gzip
from datetime import UTC, datetime, timedelta

import httpx
import pytest
import respx

from app.modules.signing import jobs as signing_jobs
from app.modules.signing.models import (
    RepositorySigningSyncState,
    RpmSigningCache,
    RpmSigningCacheStatus,
)

REPOMD_XML = b"""<?xml version="1.0" encoding="UTF-8"?>
<repomd xmlns="http://linux.duke.edu/metadata/repo">
  <data type="primary">
    <checksum type="sha256">deadbeef</checksum>
    <location href="repodata/abc-primary.xml.gz"/>
  </data>
</repomd>
"""

REPO_HREF = "/pulp/api/v3/repositories/rpm/rpm/abc/"
DIST_BASE = "/pulp/content/test-dist/"
FINGERPRINT = "A" * 40


def _primary_xml(packages: list[tuple[str, str]]) -> bytes:
    entries = "".join(
        f'<package type="rpm"><name>{name}</name>'
        f'<checksum type="sha256" pkgid="YES">{checksum}</checksum>'
        f'<location href="Packages/{name[0]}/{name}.rpm"/></package>'
        for name, checksum in packages
    )
    return (
        b'<?xml version="1.0" encoding="UTF-8"?>'
        b'<metadata xmlns="http://linux.duke.edu/metadata/common" packages="1">'
        + entries.encode()
        + b"</metadata>"
    )


def _mock_common(*, version: int = 1, primary_packages: list[tuple[str, str]] | None = None):
    respx.get(f"http://pulp:80{REPO_HREF}").mock(
        return_value=httpx.Response(
            200, json={"pulp_href": REPO_HREF, "latest_version_href": f"{REPO_HREF}versions/{version}/"}
        )
    )
    respx.get("http://pulp:80/pulp/api/v3/distributions/rpm/rpm/", params={"repository": REPO_HREF}).mock(
        return_value=httpx.Response(200, json={"results": [{"base_url": DIST_BASE}]})
    )
    respx.post("http://pulp:80/pulp/api/v3/publications/rpm/rpm/").mock(
        return_value=httpx.Response(200, json={"task": "/pulp/api/v3/tasks/pub1/"})
    )
    respx.get("http://pulp:80/pulp/api/v3/tasks/pub1/").mock(
        return_value=httpx.Response(200, json={"state": "completed"})
    )
    respx.get(f"http://pulp:80{DIST_BASE}repodata/repomd.xml").mock(
        return_value=httpx.Response(200, content=REPOMD_XML)
    )
    respx.get(f"http://pulp:80{DIST_BASE}repodata/abc-primary.xml.gz").mock(
        return_value=httpx.Response(200, content=gzip.compress(_primary_xml(primary_packages or [])))
    )


@pytest.fixture(autouse=True)
def fake_resign(monkeypatch):
    monkeypatch.setattr(
        "app.modules.signing.rpm_resign.resign_rpm_file",
        lambda path, *, fingerprint, gnupg_home: None,
    )


@respx.mock
def test_resign_repository_packages_downloads_signs_reuploads_and_swaps(db):
    _mock_common(primary_packages=[("zebra-0.1-2.noarch", "sum1")])
    respx.get(f"http://pulp:80{DIST_BASE}Packages/z/zebra-0.1-2.noarch.rpm").mock(
        return_value=httpx.Response(200, content=b"fake-rpm-bytes")
    )
    respx.get(
        "http://pulp:80/pulp/api/v3/content/rpm/packages/",
        params={"repository_version": f"{REPO_HREF}versions/1/", "limit": 1000, "offset": 0},
    ).mock(
        return_value=httpx.Response(
            200,
            json={
                "results": [
                    {"pulp_href": "/pulp/api/v3/content/rpm/packages/old/", "sha256": "sum1", "signing_keys": None}
                ],
                "next": None,
            },
        )
    )
    upload_route = respx.post("http://pulp:80/pulp/api/v3/content/rpm/packages/upload/").mock(
        return_value=httpx.Response(201, json={"pulp_href": "/pulp/api/v3/content/rpm/packages/new/"})
    )
    modify_route = respx.post(f"http://pulp:80{REPO_HREF}modify/").mock(
        return_value=httpx.Response(200, json={"task": "/pulp/api/v3/tasks/mod1/"})
    )
    respx.get("http://pulp:80/pulp/api/v3/tasks/mod1/").mock(
        return_value=httpx.Response(200, json={"state": "completed"})
    )

    result = signing_jobs.resign_repository_packages_job(
        db, {"repository_href": REPO_HREF, "fingerprint": FINGERPRINT}
    )

    assert result["candidates"] == 1
    assert result["signed"] == 1
    assert result["cache_hits"] == 0
    assert result["failed"] == 0
    assert upload_route.called
    modify_body = modify_route.calls.last.request.content
    assert b"/pulp/api/v3/content/rpm/packages/new/" in modify_body
    assert b"/pulp/api/v3/content/rpm/packages/old/" in modify_body

    cache_row = (
        db.query(RpmSigningCache)
        .filter(RpmSigningCache.source_sha256 == "sum1", RpmSigningCache.fingerprint == FINGERPRINT)
        .one()
    )
    assert cache_row.status == RpmSigningCacheStatus.SUCCESS
    assert cache_row.signed_content_href == "/pulp/api/v3/content/rpm/packages/new/"

    state = db.query(RepositorySigningSyncState).filter_by(repository_href=REPO_HREF).one()
    assert state.last_processed_version == 1


@respx.mock
def test_a_cache_hit_skips_download_sign_and_upload_entirely(db):
    """The whole point of the cache: a package whose (source_sha256,
    fingerprint) is already a recorded success is never re-downloaded,
    re-signed, or re-uploaded - it's just swapped into the repository using
    the already-known signed_content_href."""
    db.add(
        RpmSigningCache(
            source_sha256="sum1",
            fingerprint=FINGERPRINT,
            status=RpmSigningCacheStatus.SUCCESS,
            signed_content_href="/pulp/api/v3/content/rpm/packages/already-signed/",
            signed_sha256="deadbeefcafe",
        )
    )
    db.flush()

    _mock_common(primary_packages=[("zebra-0.1-2.noarch", "sum1")])
    respx.get(
        "http://pulp:80/pulp/api/v3/content/rpm/packages/",
        params={"repository_version": f"{REPO_HREF}versions/1/", "limit": 1000, "offset": 0},
    ).mock(
        return_value=httpx.Response(
            200,
            json={
                "results": [
                    {"pulp_href": "/pulp/api/v3/content/rpm/packages/old/", "sha256": "sum1", "signing_keys": None}
                ],
                "next": None,
            },
        )
    )
    upload_route = respx.post("http://pulp:80/pulp/api/v3/content/rpm/packages/upload/")
    download_route = respx.get(f"http://pulp:80{DIST_BASE}Packages/z/zebra-0.1-2.noarch.rpm")
    modify_route = respx.post(f"http://pulp:80{REPO_HREF}modify/").mock(
        return_value=httpx.Response(200, json={"task": "/pulp/api/v3/tasks/mod1/"})
    )
    respx.get("http://pulp:80/pulp/api/v3/tasks/mod1/").mock(
        return_value=httpx.Response(200, json={"state": "completed"})
    )

    result = signing_jobs.resign_repository_packages_job(
        db, {"repository_href": REPO_HREF, "fingerprint": FINGERPRINT}
    )

    assert result["cache_hits"] == 1
    assert result["signed"] == 0
    assert not download_route.called
    assert not upload_route.called
    modify_body = modify_route.calls.last.request.content
    assert b"/pulp/api/v3/content/rpm/packages/already-signed/" in modify_body


@respx.mock
def test_a_package_already_signed_with_the_target_fingerprint_is_never_a_candidate(db):
    """Pulp's own `signing_keys` field on the package is checked before ever
    touching the cache - a package the on-upload signing pipeline already
    signed correctly needs no cache lookup, download, or swap at all."""
    _mock_common(primary_packages=[("zebra-0.1-2.noarch", "sum1")])
    respx.get(
        "http://pulp:80/pulp/api/v3/content/rpm/packages/",
        params={"repository_version": f"{REPO_HREF}versions/1/", "limit": 1000, "offset": 0},
    ).mock(
        return_value=httpx.Response(
            200,
            json={
                "results": [
                    {
                        "pulp_href": "/pulp/api/v3/content/rpm/packages/old/",
                        "sha256": "sum1",
                        "signing_keys": [FINGERPRINT],
                    }
                ],
                "next": None,
            },
        )
    )

    result = signing_jobs.resign_repository_packages_job(
        db, {"repository_href": REPO_HREF, "fingerprint": FINGERPRINT}
    )

    assert result["evaluated"] == 1
    assert result["candidates"] == 0
    assert result["signed"] == 0
    assert result["failed"] == 0
    state = db.query(RepositorySigningSyncState).filter_by(repository_href=REPO_HREF).one()
    assert state.last_processed_version == 1


@respx.mock
def test_a_previously_failed_cache_row_is_retried(db):
    db.add(
        RpmSigningCache(
            source_sha256="sum1", fingerprint=FINGERPRINT, status=RpmSigningCacheStatus.FAILED, last_error="boom"
        )
    )
    db.flush()

    _mock_common(primary_packages=[("zebra-0.1-2.noarch", "sum1")])
    respx.get(f"http://pulp:80{DIST_BASE}Packages/z/zebra-0.1-2.noarch.rpm").mock(
        return_value=httpx.Response(200, content=b"fake-rpm-bytes")
    )
    respx.get(
        "http://pulp:80/pulp/api/v3/content/rpm/packages/",
        params={"repository_version": f"{REPO_HREF}versions/1/", "limit": 1000, "offset": 0},
    ).mock(
        return_value=httpx.Response(
            200,
            json={
                "results": [
                    {"pulp_href": "/pulp/api/v3/content/rpm/packages/old/", "sha256": "sum1", "signing_keys": None}
                ],
                "next": None,
            },
        )
    )
    respx.post("http://pulp:80/pulp/api/v3/content/rpm/packages/upload/").mock(
        return_value=httpx.Response(201, json={"pulp_href": "/pulp/api/v3/content/rpm/packages/new/"})
    )
    respx.post(f"http://pulp:80{REPO_HREF}modify/").mock(
        return_value=httpx.Response(200, json={"task": "/pulp/api/v3/tasks/mod1/"})
    )
    respx.get("http://pulp:80/pulp/api/v3/tasks/mod1/").mock(
        return_value=httpx.Response(200, json={"state": "completed"})
    )

    result = signing_jobs.resign_repository_packages_job(
        db, {"repository_href": REPO_HREF, "fingerprint": FINGERPRINT}
    )

    assert result["signed"] == 1
    cache_row = (
        db.query(RpmSigningCache)
        .filter(RpmSigningCache.source_sha256 == "sum1", RpmSigningCache.fingerprint == FINGERPRINT)
        .one()
    )
    assert cache_row.status == RpmSigningCacheStatus.SUCCESS


@respx.mock
def test_a_fresh_running_row_is_left_alone_not_double_signed(db):
    """A RUNNING row that isn't stale means another worker/job is already on
    this exact source package - this run must not sign it again."""
    db.add(
        RpmSigningCache(
            source_sha256="sum1",
            fingerprint=FINGERPRINT,
            status=RpmSigningCacheStatus.RUNNING,
        )
    )
    db.flush()

    _mock_common(primary_packages=[("zebra-0.1-2.noarch", "sum1")])
    respx.get(
        "http://pulp:80/pulp/api/v3/content/rpm/packages/",
        params={"repository_version": f"{REPO_HREF}versions/1/", "limit": 1000, "offset": 0},
    ).mock(
        return_value=httpx.Response(
            200,
            json={
                "results": [
                    {"pulp_href": "/pulp/api/v3/content/rpm/packages/old/", "sha256": "sum1", "signing_keys": None}
                ],
                "next": None,
            },
        )
    )
    download_route = respx.get(f"http://pulp:80{DIST_BASE}Packages/z/zebra-0.1-2.noarch.rpm")

    result = signing_jobs.resign_repository_packages_job(
        db, {"repository_href": REPO_HREF, "fingerprint": FINGERPRINT}
    )

    assert result["signed"] == 0
    assert result["running_elsewhere"] == 1
    assert not download_route.called


@respx.mock
def test_a_stale_running_row_is_treated_as_retryable(db):
    row = RpmSigningCache(source_sha256="sum1", fingerprint=FINGERPRINT, status=RpmSigningCacheStatus.RUNNING)
    db.add(row)
    db.flush()
    row.updated_at = datetime.now(UTC) - timedelta(hours=1)
    db.flush()

    _mock_common(primary_packages=[("zebra-0.1-2.noarch", "sum1")])
    respx.get(f"http://pulp:80{DIST_BASE}Packages/z/zebra-0.1-2.noarch.rpm").mock(
        return_value=httpx.Response(200, content=b"fake-rpm-bytes")
    )
    respx.get(
        "http://pulp:80/pulp/api/v3/content/rpm/packages/",
        params={"repository_version": f"{REPO_HREF}versions/1/", "limit": 1000, "offset": 0},
    ).mock(
        return_value=httpx.Response(
            200,
            json={
                "results": [
                    {"pulp_href": "/pulp/api/v3/content/rpm/packages/old/", "sha256": "sum1", "signing_keys": None}
                ],
                "next": None,
            },
        )
    )
    respx.post("http://pulp:80/pulp/api/v3/content/rpm/packages/upload/").mock(
        return_value=httpx.Response(201, json={"pulp_href": "/pulp/api/v3/content/rpm/packages/new/"})
    )
    respx.post(f"http://pulp:80{REPO_HREF}modify/").mock(
        return_value=httpx.Response(200, json={"task": "/pulp/api/v3/tasks/mod1/"})
    )
    respx.get("http://pulp:80/pulp/api/v3/tasks/mod1/").mock(
        return_value=httpx.Response(200, json={"state": "completed"})
    )

    result = signing_jobs.resign_repository_packages_job(
        db, {"repository_href": REPO_HREF, "fingerprint": FINGERPRINT}
    )

    assert result["signed"] == 1
    assert result["running_elsewhere"] == 0


@respx.mock
def test_a_failed_package_does_not_advance_the_sync_state_watermark(db):
    """Task requirement: never silently publish a repository considered
    fully signed if some packages failed - the watermark must stay behind
    so the same version range is retried next time."""
    _mock_common(primary_packages=[("zebra-0.1-2.noarch", "sum1")])
    respx.get(f"http://pulp:80{DIST_BASE}Packages/z/zebra-0.1-2.noarch.rpm").mock(
        return_value=httpx.Response(500)
    )
    respx.get(
        "http://pulp:80/pulp/api/v3/content/rpm/packages/",
        params={"repository_version": f"{REPO_HREF}versions/1/", "limit": 1000, "offset": 0},
    ).mock(
        return_value=httpx.Response(
            200,
            json={
                "results": [
                    {"pulp_href": "/pulp/api/v3/content/rpm/packages/old/", "sha256": "sum1", "signing_keys": None}
                ],
                "next": None,
            },
        )
    )

    result = signing_jobs.resign_repository_packages_job(
        db, {"repository_href": REPO_HREF, "fingerprint": FINGERPRINT}
    )

    assert result["failed"] == 1
    assert result["signed"] == 0
    cache_row = (
        db.query(RpmSigningCache)
        .filter(RpmSigningCache.source_sha256 == "sum1", RpmSigningCache.fingerprint == FINGERPRINT)
        .one()
    )
    assert cache_row.status == RpmSigningCacheStatus.FAILED
    assert db.query(RepositorySigningSyncState).filter_by(repository_href=REPO_HREF).first() is None


@respx.mock
def test_incremental_since_version_only_looks_at_content_added_in_the_gap(db):
    """`since_version`/`target_version` (only ever set by
    detect_repository_content_changes_job) scope candidates to
    `repository_version_added` for each version between the two, never a
    full `repository_version` listing - the mechanism that makes "sync
    added 30 packages" cheap on a repository with tens of thousands."""
    _mock_common(version=3, primary_packages=[("new-0.1-1.noarch", "sum-new")])
    full_listing_route = respx.get(
        "http://pulp:80/pulp/api/v3/content/rpm/packages/",
        params={"repository_version": f"{REPO_HREF}versions/3/", "limit": 1000, "offset": 0},
    )
    respx.get(
        "http://pulp:80/pulp/api/v3/content/rpm/packages/",
        params={"repository_version_added": f"{REPO_HREF}versions/2/", "limit": 1000, "offset": 0},
    ).mock(return_value=httpx.Response(200, json={"results": [], "next": None}))
    respx.get(
        "http://pulp:80/pulp/api/v3/content/rpm/packages/",
        params={"repository_version_added": f"{REPO_HREF}versions/3/", "limit": 1000, "offset": 0},
    ).mock(
        return_value=httpx.Response(
            200,
            json={
                "results": [
                    {"pulp_href": "/pulp/api/v3/content/rpm/packages/new-old/", "sha256": "sum-new", "signing_keys": None}
                ],
                "next": None,
            },
        )
    )
    respx.get(f"http://pulp:80{DIST_BASE}Packages/n/new-0.1-1.noarch.rpm").mock(
        return_value=httpx.Response(200, content=b"fake-rpm-bytes")
    )
    respx.post("http://pulp:80/pulp/api/v3/content/rpm/packages/upload/").mock(
        return_value=httpx.Response(201, json={"pulp_href": "/pulp/api/v3/content/rpm/packages/new-signed/"})
    )
    respx.post(f"http://pulp:80{REPO_HREF}modify/").mock(
        return_value=httpx.Response(200, json={"task": "/pulp/api/v3/tasks/mod1/"})
    )
    respx.get("http://pulp:80/pulp/api/v3/tasks/mod1/").mock(
        return_value=httpx.Response(200, json={"state": "completed"})
    )

    result = signing_jobs.resign_repository_packages_job(
        db,
        {
            "repository_href": REPO_HREF,
            "fingerprint": FINGERPRINT,
            "since_version": f"{REPO_HREF}versions/1/",
            "target_version": f"{REPO_HREF}versions/3/",
        },
    )

    assert result["candidates"] == 1
    assert result["signed"] == 1
    assert not full_listing_route.called
    state = db.query(RepositorySigningSyncState).filter_by(repository_href=REPO_HREF).one()
    assert state.last_processed_version == 3


@respx.mock
def test_resign_repository_packages_skips_packages_missing_from_published_metadata(db):
    """A package Pulp reports for the version but that isn't (yet) reflected
    in published metadata is skipped, not fatal - counted so an operator can
    notice, matching this project's "document, don't silently drop" policy."""
    _mock_common(primary_packages=[])
    respx.get(
        "http://pulp:80/pulp/api/v3/content/rpm/packages/",
        params={"repository_version": f"{REPO_HREF}versions/1/", "limit": 1000, "offset": 0},
    ).mock(
        return_value=httpx.Response(
            200,
            json={
                "results": [
                    {"pulp_href": "/pulp/api/v3/content/rpm/packages/old/", "sha256": "missing", "signing_keys": None}
                ],
                "next": None,
            },
        )
    )

    result = signing_jobs.resign_repository_packages_job(
        db, {"repository_href": REPO_HREF, "fingerprint": FINGERPRINT}
    )

    assert result["signed"] == 0
    assert result["skipped"] == 1
    assert result["failed"] == 0
    # Not fully covered this run (the one candidate was never actually
    # checked/resigned) - the watermark still advances here because "not
    # found in published metadata" isn't a *failed sign attempt*, it's
    # covered by the same publish-then-read window documented in "Known
    # limitations"; a future sync/detection cycle re-evaluates it once
    # metadata catches up.
    state = db.query(RepositorySigningSyncState).filter_by(repository_href=REPO_HREF).one()
    assert state.last_processed_version == 1


@respx.mock
def test_resign_repository_packages_skips_gracefully_for_a_never_synced_repository(db):
    """A repository whose latest version is 0 (never had content added) has
    nothing to resign - this must not fail just because it also has no
    distribution yet, a real, common state for a freshly created repository."""
    respx.get(f"http://pulp:80{REPO_HREF}").mock(
        return_value=httpx.Response(
            200, json={"pulp_href": REPO_HREF, "latest_version_href": f"{REPO_HREF}versions/0/"}
        )
    )

    result = signing_jobs.resign_repository_packages_job(
        db, {"repository_href": REPO_HREF, "fingerprint": FINGERPRINT}
    )

    assert result == {
        "evaluated": 0, "candidates": 0, "cache_hits": 0, "resigned": 0, "signed": 0, "skipped": 0, "failed": 0,
    }


@respx.mock
def test_resign_repository_packages_requires_a_distribution():
    respx.get(f"http://pulp:80{REPO_HREF}").mock(
        return_value=httpx.Response(
            200, json={"pulp_href": REPO_HREF, "latest_version_href": f"{REPO_HREF}versions/1/"}
        )
    )
    respx.get("http://pulp:80/pulp/api/v3/distributions/rpm/rpm/", params={"repository": REPO_HREF}).mock(
        return_value=httpx.Response(200, json={"results": []})
    )

    try:
        signing_jobs.resign_repository_packages_job(None, {"repository_href": REPO_HREF, "fingerprint": FINGERPRINT})
        raise AssertionError("expected ValueError")
    except ValueError as exc:
        assert "no distribution" in str(exc)


@respx.mock
def test_a_failed_configure_task_stops_the_resign_before_touching_the_repository():
    """The per-repository "Re-sign" route queues this job behind the
    caller's own signing-configuration PATCH (`configure_task`) - a failed
    PATCH must not be followed by a resign/publish with stale services."""
    respx.get("http://pulp:80/pulp/api/v3/tasks/cfg/").mock(
        return_value=httpx.Response(200, json={"state": "failed", "error": {"description": "boom"}})
    )
    repo_route = respx.get(f"http://pulp:80{REPO_HREF}")

    with pytest.raises(ValueError, match="Pulp signing configuration failed"):
        signing_jobs.resign_repository_packages_job(
            None,
            {"repository_href": REPO_HREF, "fingerprint": FINGERPRINT, "configure_task": "/pulp/api/v3/tasks/cfg/"},
        )
    assert not repo_route.called
