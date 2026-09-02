"""Job handler registry.

Modules register their own handlers under their own namespaced job_type
(e.g. "signing.generate_key") - the worker loop (pulpit-core/worker/main.py)
looks handlers up here by job_type, so the generic job runner never imports
a specific module and a module never has to know how the runner works.
This is the seam that lets a future module ship jobs without touching
anything in app/core or any other module.
"""

from collections.abc import Callable
from dataclasses import dataclass, field

from sqlalchemy.orm import Session

JobHandler = Callable[[Session, dict], dict]


@dataclass
class _JobRegistry:
    _handlers: dict[str, JobHandler] = field(default_factory=dict)

    def register(self, job_type: str, handler: JobHandler) -> None:
        existing = self._handlers.get(job_type)
        if existing is not None and existing is not handler:
            raise ValueError(f"Job type {job_type!r} is already registered to a different handler")
        self._handlers[job_type] = handler

    def get(self, job_type: str) -> JobHandler | None:
        return self._handlers.get(job_type)

    def known_types(self) -> list[str]:
        return sorted(self._handlers)


job_registry = _JobRegistry()
