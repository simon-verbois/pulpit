"""Seeds one sample Repository+Remote(+Distribution) per plugin so a fresh
instance isn't a totally empty shell - see fixtures.py for the per-plugin
data and why pulp_npm is skipped entirely and pulp_maven/pulp_hugging_face
only get a Remote. Runs as a scheduled job (module.py's `scheduled_jobs`,
same mechanism as content_size.refresh) rather than inline at process
startup, since it makes real outbound HTTP calls to public fixture servers
that could be slow or briefly unreachable - never something a request (or
app startup itself) should block on.

Only ever does real work once per instance: `service.has_seeded` short-
circuits every later invocation, so the periodic reschedule (module.py) is
just a cheap no-op check after the first attempt, successful or not - see
`service.mark_seeded`'s docstring for why a partial failure still marks it.
"""

from sqlalchemy.orm import Session

from app.adapters.pulp.client import get_pulp_client
from app.adapters.pulp.exceptions import PulpAdapterError
from app.core.config import get_settings
from app.core.jobs.registry import job_registry
from app.modules.fixture_seed import service
from app.modules.fixture_seed.fixtures import FIXTURES, PluginFixture

JOB_TYPE = "fixture_seed.seed_sample_fixtures"


def _seed_one(client, fixture: PluginFixture) -> str:
    """Returns a short outcome string for the job's own result payload;
    raises PulpAdapterError on any failed stage, caught by the caller so one
    plugin's failure never blocks the rest (same "never blocks the rest"
    convention as default_settings.apply_proxy_to_all_remotes_job)."""
    remote = client.create_remote(fixture.remote_type_path, fixture.remote_body)

    if fixture.repository_type_path is None:
        return "remote only (cache-only plugin)"

    repo = client.create_repository(fixture.repository_type_path, {"name": fixture.name})

    if fixture.sync:
        sync_result = client.sync_repository(repo["pulp_href"], remote["pulp_href"])
        task = client.wait_for_task(sync_result["task"])
        if task["state"] != "completed":
            raise PulpAdapterError(f"sync task {task['state']}: {task.get('error')}")

    if fixture.distribution_type_path is not None:
        distribution = client.create_distribution(
            fixture.distribution_type_path,
            {"name": fixture.name, "base_path": fixture.name, "repository": repo["pulp_href"]},
        )
        if "task" in distribution:
            dist_task = client.wait_for_task(distribution["task"])
            if dist_task["state"] != "completed":
                raise PulpAdapterError(
                    f"distribution task {dist_task['state']}: {dist_task.get('error')}"
                )

    return "seeded"


def seed_sample_fixtures_job(db: Session, _payload: dict) -> dict:
    # Belt-and-suspenders alongside module.py's scheduling gate: that gate
    # already keeps this job from ever being scheduled when disabled, but a
    # stray/manual enqueue of JOB_TYPE (e.g. a leftover row from before the
    # setting was flipped) should still no-op rather than reach out to eight
    # public fixture hosts with privileged Pulp credentials.
    if not get_settings().fixture_seed_enabled:
        return {"skipped": True, "reason": "fixture_seed disabled (PULPIT_CORE_FIXTURE_SEED_ENABLED)"}

    if service.has_seeded(db):
        return {"skipped": True, "reason": "already seeded"}

    client = get_pulp_client()
    created: list[dict] = []
    failed: list[dict] = []
    for fixture in FIXTURES:
        try:
            outcome = _seed_one(client, fixture)
            created.append({"plugin": fixture.plugin, "outcome": outcome})
        except PulpAdapterError as exc:
            failed.append({"plugin": fixture.plugin, "error": str(exc)})

    service.mark_seeded(db)
    return {"created": created, "failed": failed}


def register() -> None:
    job_registry.register(JOB_TYPE, seed_sample_fixtures_job)
