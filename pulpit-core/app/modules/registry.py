"""Module loader.

Adding a future module (repository lifecycle automation, validation,
vulnerability scanning, ...) means writing one package under app/modules/
that exposes `router` (FastAPI APIRouter) and `register(...)` (job handlers
+ event subscriptions), then adding one line here. Nothing else in
app/core or any other module needs to change - this is the seam the task's
"module B must not destabilize module A" requirement is built on.
"""

from fastapi import APIRouter

from app.modules.content_size import module as content_size_module
from app.modules.default_settings import module as default_settings_module
from app.modules.fixture_seed import module as fixture_seed_module
from app.modules.nav_visibility import module as nav_visibility_module
from app.modules.signing import module as signing_module

_MODULES = [
    signing_module,
    content_size_module,
    default_settings_module,
    nav_visibility_module,
    fixture_seed_module,
]


def build_module_router() -> APIRouter:
    """Authenticated, versioned API surface: every module's `router` is
    namespaced under its own name so two modules can never collide on a
    path (module isolation, task section 1/13)."""
    router = APIRouter()
    for module in _MODULES:
        router.include_router(module.router, prefix=f"/{module.name}", tags=[module.name])
    return router


def build_public_router() -> APIRouter:
    """Unauthenticated, unprefixed routes a module explicitly opts into
    (e.g. signing's public key distribution endpoint, task section 7, which
    must be a stable `/keys/<filename>` URL DNF clients fetch directly, not
    nested under `/api/v1/signing/...`). A module without a `public_router`
    attribute simply has none - this stays opt-in, not a loophole every
    module gets by default."""
    router = APIRouter()
    for module in _MODULES:
        if public_router := getattr(module, "public_router", None):
            router.include_router(public_router, tags=[f"{module.name}-public"])
    return router


def register_all() -> None:
    """Wires job handlers + event subscriptions for every module. Called
    once at process startup by both the API app and the worker."""
    for module in _MODULES:
        module.register()


def build_scheduled_jobs() -> list[tuple[str, int]]:
    """Collects every module's own `(job_type, interval_seconds)` periodic
    heartbeats (opt-in, like `public_router` above - a module without a
    `scheduled_jobs` attribute simply has none). worker/main.py's generic
    scheduler loop enqueues each one whenever its interval has elapsed,
    without needing to know which module or job it belongs to."""
    scheduled: list[tuple[str, int]] = []
    for module in _MODULES:
        scheduled.extend(getattr(module, "scheduled_jobs", []))
    return scheduled
