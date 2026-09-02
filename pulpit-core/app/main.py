import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.router import api_router, public_router
from app.core.config import get_settings
from app.modules.registry import register_all

logging.basicConfig(level=get_settings().log_level)


@asynccontextmanager
async def _lifespan(_app: FastAPI) -> AsyncIterator[None]:
    register_all()
    yield


app = FastAPI(
    title="pulpit-core",
    description="Pulpit's extensible backend component - generic job/event "
    "infrastructure plus feature modules (signing, and future automation "
    "modules). See docs/adr/0006-pulpit-core-backend.md.",
    version="0.1.0",
    lifespan=_lifespan,
)

# Authenticated, versioned module API - reached by the browser only via the
# same-origin nginx proxy at /pulpit-core/api/... (ADR 0005 continues to
# apply: no CORS, no absolute hostnames).
app.include_router(api_router, prefix="/api/v1")

# Unauthenticated, unprefixed routes a module explicitly opts into (signing's
# public key distribution - task section 7).
app.include_router(public_router)
