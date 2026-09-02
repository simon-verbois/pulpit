from fastapi import APIRouter

from app.api.health import router as health_router
from app.core.jobs.routes import router as jobs_router
from app.modules.registry import build_module_router, build_public_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(jobs_router)
api_router.include_router(build_module_router())

public_router = build_public_router()
