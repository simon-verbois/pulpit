"""fixture_seed module's public surface - the only file
app/modules/registry.py imports from this package (same seam as signing,
content_size, and default_settings; see app/modules/signing/module.py).

No routes: this module has no user-facing API surface at all, only a
background job (jobs.py) - `router` stays empty because
app/modules/registry.py's build_module_router() expects every module to
have one, same as it expects every module to have `register()`."""

from fastapi import APIRouter

from app.core.config import get_settings
from app.modules.fixture_seed import jobs as fixture_seed_jobs

name = "fixture_seed"

router = APIRouter()

# Re-checked every 5 minutes (module.py convention, see worker/main.py) - the
# job itself is a fast no-op after the first attempt (service.has_seeded),
# so this only matters for retrying a few times if Pulp/the public fixture
# servers aren't reachable yet on the very first run after a fresh install.
#
# Gated on settings.fixture_seed_enabled (default True, see
# app/core/config/settings.py's docstring): a deployment that opted out never
# gets this job scheduled at all, rather than relying solely on jobs.py's own
# belt-and-suspenders early-return - an operator auditing "what egress can
# this instance possibly make on its own" should be able to answer that by
# reading the schedule, not by trusting every job body to self-check.
scheduled_jobs = (
    [("fixture_seed.seed_sample_fixtures", 300)] if get_settings().fixture_seed_enabled else []
)


def register() -> None:
    fixture_seed_jobs.register()
