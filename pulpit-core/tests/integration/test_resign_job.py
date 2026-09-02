"""Orchestration of the mandatory package-resign job (task requirement:
publishing a key always resigns already-existing packages, not an option).
The actual `rpmsign` call is monkeypatched (this venv doesn't necessarily
have `rpmsign` installed - the real binary is only guaranteed inside the
pulpit-worker image, exercised live in docs/signing.md's manual verification
pass); everything else here is real orchestration logic against a
respx-mocked Pulp HTTP boundary, matching this project's mocking policy."""

import gzip

import httpx
import respx

from app.modules.signing import jobs as signing_jobs

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


@respx.mock
def test_resign_repository_packages_downloads_signs_reuploads_and_swaps(monkeypatch):
    signed = []
    monkeypatch.setattr(
        "app.modules.signing.rpm_resign.resign_rpm_file",
        lambda path, *, fingerprint, gnupg_home: signed.append((path.name, fingerprint)),
    )

    respx.get(f"http://pulp:80{REPO_HREF}").mock(
        return_value=httpx.Response(
            200, json={"pulp_href": REPO_HREF, "latest_version_href": f"{REPO_HREF}versions/1/"}
        )
    )
    respx.get("http://pulp:80/pulp/api/v3/distributions/rpm/rpm/", params={"repository": REPO_HREF}).mock(
        return_value=httpx.Response(200, json={"results": [{"base_url": DIST_BASE}]})
    )
    publish_route = respx.post("http://pulp:80/pulp/api/v3/publications/rpm/rpm/").mock(
        return_value=httpx.Response(200, json={"task": "/pulp/api/v3/tasks/pub1/"})
    )
    respx.get(f"http://pulp:80{DIST_BASE}repodata/repomd.xml").mock(
        return_value=httpx.Response(200, content=REPOMD_XML)
    )
    respx.get(f"http://pulp:80{DIST_BASE}repodata/abc-primary.xml.gz").mock(
        return_value=httpx.Response(200, content=gzip.compress(_primary_xml([("zebra-0.1-2.noarch", "sum1")])))
    )
    respx.get(f"http://pulp:80{DIST_BASE}Packages/z/zebra-0.1-2.noarch.rpm").mock(
        return_value=httpx.Response(200, content=b"fake-rpm-bytes")
    )
    respx.get(
        "http://pulp:80/pulp/api/v3/content/rpm/packages/",
        params={"repository_version": f"{REPO_HREF}versions/1/", "limit": 100, "offset": 0},
    ).mock(
        return_value=httpx.Response(
            200,
            json={
                "results": [
                    {
                        "pulp_href": "/pulp/api/v3/content/rpm/packages/old/",
                        "sha256": "sum1",
                    }
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
    respx.get("http://pulp:80/pulp/api/v3/tasks/pub1/").mock(
        return_value=httpx.Response(200, json={"state": "completed"})
    )
    respx.get("http://pulp:80/pulp/api/v3/tasks/mod1/").mock(
        return_value=httpx.Response(200, json={"state": "completed"})
    )

    result = signing_jobs.resign_repository_packages_job(
        None, {"repository_href": REPO_HREF, "fingerprint": "A" * 40}
    )

    assert result == {"resigned": 1, "skipped": 0}
    assert signed == [("zebra-0.1-2.noarch.rpm", "A" * 40)]
    assert publish_route.call_count == 2  # once before resigning, once after swapping content
    assert upload_route.called
    modify_body = modify_route.calls.last.request.content
    assert b"/pulp/api/v3/content/rpm/packages/new/" in modify_body
    assert b"/pulp/api/v3/content/rpm/packages/old/" in modify_body


@respx.mock
def test_resign_repository_packages_skips_packages_missing_from_published_metadata(monkeypatch):
    """A package Pulp reports for the version but that isn't (yet) reflected
    in published metadata is skipped, not fatal - counted so an operator can
    notice, matching this project's "document, don't silently drop" policy."""
    monkeypatch.setattr(
        "app.modules.signing.rpm_resign.resign_rpm_file",
        lambda *a, **k: None,
    )

    respx.get(f"http://pulp:80{REPO_HREF}").mock(
        return_value=httpx.Response(
            200, json={"pulp_href": REPO_HREF, "latest_version_href": f"{REPO_HREF}versions/1/"}
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
        return_value=httpx.Response(200, content=gzip.compress(_primary_xml([])))
    )
    respx.get(
        "http://pulp:80/pulp/api/v3/content/rpm/packages/",
        params={"repository_version": f"{REPO_HREF}versions/1/", "limit": 100, "offset": 0},
    ).mock(
        return_value=httpx.Response(
            200,
            json={"results": [{"pulp_href": "/pulp/api/v3/content/rpm/packages/old/", "sha256": "missing"}], "next": None},
        )
    )

    result = signing_jobs.resign_repository_packages_job(
        None, {"repository_href": REPO_HREF, "fingerprint": "A" * 40}
    )

    assert result == {"resigned": 0, "skipped": 1}


@respx.mock
def test_resign_repository_packages_skips_gracefully_for_a_never_synced_repository():
    """A repository whose latest version is 0 (never had content added) has
    nothing to resign - this must not fail just because it also has no
    distribution yet, a real, common state for a freshly created repository."""
    respx.get(f"http://pulp:80{REPO_HREF}").mock(
        return_value=httpx.Response(
            200, json={"pulp_href": REPO_HREF, "latest_version_href": f"{REPO_HREF}versions/0/"}
        )
    )

    result = signing_jobs.resign_repository_packages_job(
        None, {"repository_href": REPO_HREF, "fingerprint": "A" * 40}
    )

    assert result == {"resigned": 0, "skipped": 0}


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
        signing_jobs.resign_repository_packages_job(None, {"repository_href": REPO_HREF, "fingerprint": "A" * 40})
        raise AssertionError("expected ValueError")
    except ValueError as exc:
        assert "no distribution" in str(exc)
