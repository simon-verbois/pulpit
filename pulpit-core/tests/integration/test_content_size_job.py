"""content_size.refresh and content_size.refresh_repository_counts job
behavior against a real database, Pulp mocked at the HTTP boundary with
respx (see docs/TESTING.md's mocking policy) - shapes mirror what was
verified live against a real Pulp instance (see app/adapters/pulp/client.py's
content_size comment)."""

import httpx
import respx

from app.modules.content_size import service
from app.modules.content_size.jobs import (
    refresh_content_sizes_job,
    refresh_repository_counts_job,
)


def _mock_pulp(
    *,
    artifacts: list[dict],
    content: list[dict],
    repositories: list[dict] | None = None,
    repo_content: dict[str, list[dict]] | None = None,
) -> None:
    respx.get(
        "http://pulp:80/pulp/api/v3/artifacts/",
        params={"fields": "pulp_href,size", "limit": 1000, "offset": 0},
    ).mock(
        return_value=httpx.Response(
            200, json={"count": len(artifacts), "next": None, "results": artifacts}
        )
    )

    repo_content = repo_content or {}

    # A single callback, not two param-matched routes: respx's `params=`
    # matching is "contains", not exact, so a route with no
    # `repository_version` key would also match a request that HAS one
    # (both are supersets of the pattern) - whichever route is registered
    # first silently wins for every request. Branching on the real request's
    # params here is unambiguous regardless of match order.
    def content_handler(request: httpx.Request) -> httpx.Response:
        version = request.url.params.get("repository_version")
        items = repo_content[version] if version is not None else content
        return httpx.Response(200, json={"count": len(items), "next": None, "results": items})

    respx.get("http://pulp:80/pulp/api/v3/content/").mock(side_effect=content_handler)

    repositories = repositories or []
    respx.get(
        "http://pulp:80/pulp/api/v3/repositories/",
        params={"fields": "pulp_href,latest_version_href", "limit": 1000, "offset": 0},
    ).mock(
        return_value=httpx.Response(
            200, json={"count": len(repositories), "next": None, "results": repositories}
        )
    )


@respx.mock
def test_sums_artifact_sizes_per_component(db):
    _mock_pulp(
        artifacts=[
            {"pulp_href": "/pulp/api/v3/artifacts/a1/", "size": 100},
            {"pulp_href": "/pulp/api/v3/artifacts/a2/", "size": 250},
            {"pulp_href": "/pulp/api/v3/artifacts/a3/", "size": 833},
        ],
        content=[
            {
                "pulp_href": "/pulp/api/v3/content/rpm/packages/c1/",
                "artifacts": {"one.rpm": "/pulp/api/v3/artifacts/a1/"},
            },
            {
                "pulp_href": "/pulp/api/v3/content/rpm/packages/c2/",
                "artifacts": {"two.rpm": "/pulp/api/v3/artifacts/a2/"},
            },
            {
                "pulp_href": "/pulp/api/v3/content/ansible/roles/c3/",
                "artifacts": {"role.tar.gz": "/pulp/api/v3/artifacts/a3/"},
            },
            # Metadata-only content (no artifact) contributes 0, never errors.
            {"pulp_href": "/pulp/api/v3/content/ansible/namespaces/c4/", "artifacts": {}},
        ],
    )

    result = refresh_content_sizes_job(db, {})

    assert result == {"components": ["ansible", "rpm"], "repositories": 0}
    sizes = {row.component: row.size_bytes for row in service.list_content_sizes(db)}
    assert sizes == {"rpm": 350, "ansible": 833}


@respx.mock
def test_component_with_no_content_left_is_removed_on_next_run(db):
    _mock_pulp(
        artifacts=[{"pulp_href": "/pulp/api/v3/artifacts/a1/", "size": 500}],
        content=[
            {
                "pulp_href": "/pulp/api/v3/content/deb/packages/c1/",
                "artifacts": {"one.deb": "/pulp/api/v3/artifacts/a1/"},
            },
        ],
    )
    refresh_content_sizes_job(db, {})
    assert {row.component for row in service.list_content_sizes(db)} == {"deb"}

    respx.clear()
    _mock_pulp(artifacts=[], content=[])
    refresh_content_sizes_job(db, {})

    # The deb content was orphan-cleaned since the previous run (this run's
    # scan saw none) - its cached row must go, not linger at a stale value.
    assert service.list_content_sizes(db) == []


@respx.mock
def test_sums_artifact_sizes_per_repository(db):
    version_a = "/pulp/api/v3/repositories/rpm/rpm/repo-a/versions/1/"
    version_b = "/pulp/api/v3/repositories/ansible/ansible/repo-b/versions/0/"
    _mock_pulp(
        artifacts=[
            {"pulp_href": "/pulp/api/v3/artifacts/a1/", "size": 100},
            {"pulp_href": "/pulp/api/v3/artifacts/a2/", "size": 250},
        ],
        content=[
            {
                "pulp_href": "/pulp/api/v3/content/rpm/packages/c1/",
                "artifacts": {"one.rpm": "/pulp/api/v3/artifacts/a1/"},
            },
            {
                "pulp_href": "/pulp/api/v3/content/ansible/roles/c2/",
                "artifacts": {"two.tar.gz": "/pulp/api/v3/artifacts/a2/"},
            },
        ],
        repositories=[
            {
                "pulp_href": "/pulp/api/v3/repositories/rpm/rpm/repo-a/",
                "latest_version_href": version_a,
            },
            {
                "pulp_href": "/pulp/api/v3/repositories/ansible/ansible/repo-b/",
                "latest_version_href": version_b,
            },
            # A brand-new repository with no version created yet is skipped,
            # not treated as a 0-byte repository.
            {
                "pulp_href": "/pulp/api/v3/repositories/rpm/rpm/repo-c/",
                "latest_version_href": None,
            },
        ],
        repo_content={
            version_a: [
                {
                    "pulp_href": "/pulp/api/v3/content/rpm/packages/c1/",
                    "artifacts": {"one.rpm": "/pulp/api/v3/artifacts/a1/"},
                },
            ],
            version_b: [
                {
                    "pulp_href": "/pulp/api/v3/content/ansible/roles/c2/",
                    "artifacts": {"two.tar.gz": "/pulp/api/v3/artifacts/a2/"},
                },
            ],
        },
    )

    result = refresh_content_sizes_job(db, {})

    assert result["repositories"] == 2
    sizes = {row.repository_href: row.size_bytes for row in service.list_repository_sizes(db)}
    assert sizes == {
        "/pulp/api/v3/repositories/rpm/rpm/repo-a/": 100,
        "/pulp/api/v3/repositories/ansible/ansible/repo-b/": 250,
    }


@respx.mock
def test_counts_repositories_per_component(db):
    _mock_pulp(
        artifacts=[],
        content=[],
        repositories=[
            {"pulp_href": "/pulp/api/v3/repositories/rpm/rpm/repo-a/", "latest_version_href": None},
            {"pulp_href": "/pulp/api/v3/repositories/rpm/rpm/repo-b/", "latest_version_href": None},
            {
                "pulp_href": "/pulp/api/v3/repositories/ansible/ansible/repo-c/",
                "latest_version_href": None,
            },
        ],
    )

    result = refresh_repository_counts_job(db, {})

    assert result == {"components": ["ansible", "rpm"]}
    counts = {row.component: row.count for row in service.list_repository_counts(db)}
    assert counts == {"rpm": 2, "ansible": 1}


@respx.mock
def test_component_with_no_repositories_left_is_removed_on_next_run(db):
    _mock_pulp(
        artifacts=[],
        content=[],
        repositories=[
            {"pulp_href": "/pulp/api/v3/repositories/deb/apt/repo-a/", "latest_version_href": None},
        ],
    )
    refresh_repository_counts_job(db, {})
    assert {row.component for row in service.list_repository_counts(db)} == {"deb"}

    respx.clear()
    _mock_pulp(artifacts=[], content=[], repositories=[])
    refresh_repository_counts_job(db, {})

    assert service.list_repository_counts(db) == []
