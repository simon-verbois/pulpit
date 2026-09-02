"""Computes total content size per Pulp plugin component AND per repository
(task: Overview page "Size" column, and the same column on every
RepositoriesPage). Runs only as a scheduled background job (see
worker/main.py's generic scheduler, driven by this module's
`scheduled_jobs`) - never inline on a request, and never incrementally:
Pulp's generic `/content/` endpoint rejects `pulp_created__gte` ("Invalid
Filter", verified live), so there is no cheap way to ask for only what
changed since the last run. Each run re-sums everything; the tradeoff is an
hourly-ish full re-scan rather than partial, ongoing background/request-time
computation - see app/adapters/pulp/client.py for the endpoints this relies
on and how that was confirmed.
"""

from sqlalchemy.orm import Session

from app.adapters.pulp.client import get_pulp_client
from app.core.jobs.registry import job_registry
from app.modules.content_size import service

_PAGE_SIZE = 1000


def _component_from_content_href(href: str) -> str | None:
    """`/pulp/api/v3/content/<component>/<type>/<id>/` -> `<component>`."""
    parts = [p for p in href.split("/") if p]
    try:
        index = parts.index("content")
    except ValueError:
        return None
    if index + 1 >= len(parts):
        return None
    return parts[index + 1]


def _fetch_all_artifact_sizes(pulp) -> dict[str, int]:
    sizes: dict[str, int] = {}
    offset = 0
    while True:
        page = pulp.list_artifacts_page(limit=_PAGE_SIZE, offset=offset)
        for artifact in page["results"]:
            sizes[artifact["pulp_href"]] = artifact["size"]
        if page.get("next") is None:
            return sizes
        offset += _PAGE_SIZE


def _sum_content_size(
    pulp, artifact_sizes: dict[str, int], *, repository_version: str | None = None
) -> int:
    """Sums artifact sizes for one page-through of `/content/`, optionally
    scoped to a single repository version. Used both for the global
    per-component pass (no filter, bucketing by component - see
    `_sum_sizes_by_component`) and, unfiltered logic reused per-call here,
    for one repository's total."""
    total = 0
    offset = 0
    while True:
        page = pulp.list_content_page(
            limit=_PAGE_SIZE, offset=offset, repository_version=repository_version
        )
        for item in page["results"]:
            total += sum(
                artifact_sizes.get(artifact_href, 0)
                for artifact_href in item.get("artifacts", {}).values()
            )
        if page.get("next") is None:
            return total
        offset += _PAGE_SIZE


def _sum_sizes_by_component(pulp, artifact_sizes: dict[str, int]) -> dict[str, int]:
    totals: dict[str, int] = {}
    offset = 0
    while True:
        page = pulp.list_content_page(limit=_PAGE_SIZE, offset=offset)
        for item in page["results"]:
            component = _component_from_content_href(item["pulp_href"])
            if component is None:
                continue
            unit_size = sum(
                artifact_sizes.get(artifact_href, 0)
                for artifact_href in item.get("artifacts", {}).values()
            )
            totals[component] = totals.get(component, 0) + unit_size
        if page.get("next") is None:
            return totals
        offset += _PAGE_SIZE


def _sum_sizes_by_repository(pulp, artifact_sizes: dict[str, int]) -> dict[str, int]:
    totals: dict[str, int] = {}
    offset = 0
    while True:
        page = pulp.list_repositories_page(limit=_PAGE_SIZE, offset=offset)
        for repo in page["results"]:
            latest_version = repo.get("latest_version_href")
            if not latest_version:
                continue
            totals[repo["pulp_href"]] = _sum_content_size(
                pulp, artifact_sizes, repository_version=latest_version
            )
        if page.get("next") is None:
            return totals
        offset += _PAGE_SIZE


def refresh_content_sizes_job(db: Session, payload: dict) -> dict:
    pulp = get_pulp_client()
    artifact_sizes = _fetch_all_artifact_sizes(pulp)

    component_totals = _sum_sizes_by_component(pulp, artifact_sizes)
    service.replace_content_sizes(db, component_totals)

    repository_totals = _sum_sizes_by_repository(pulp, artifact_sizes)
    service.replace_repository_sizes(db, repository_totals)

    return {"components": sorted(component_totals), "repositories": len(repository_totals)}


def register() -> None:
    job_registry.register("content_size.refresh", refresh_content_sizes_job)
