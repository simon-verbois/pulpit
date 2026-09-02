"""Minimal in-process event bus for cross-module notification.

Why this instead of a message broker: pulpit-core's first modules all run
in the same two processes (the API and the worker); a full broker (Kafka,
RabbitMQ, Redis Streams) would be infrastructure with no current consumer
that would outlive it. Every publish is also durably recorded in
`events_log` (app/core/events/models.py) so nothing is silently lost even
though delivery to in-process subscribers is best-effort/synchronous -
that gives future modules (or an operator) a real audit trail to build a
proper outbox/broker consumer from later, without having designed the
publish call sites around any particular transport.

Module isolation rule this enables (task section 13): module B subscribes
to events module A publishes; neither imports the other's models/services.
"""

from collections.abc import Callable
from dataclasses import dataclass, field

from sqlalchemy.orm import Session

from app.core.events.models import EventLog

Subscriber = Callable[[Session, dict], None]


@dataclass
class _EventBus:
    _subscribers: dict[str, list[Subscriber]] = field(default_factory=dict)

    def subscribe(self, event_type: str, handler: Subscriber) -> None:
        self._subscribers.setdefault(event_type, []).append(handler)

    def publish(self, db: Session, event_type: str, payload: dict, *, source_module: str) -> None:
        db.add(EventLog(event_type=event_type, payload=payload, source_module=source_module))
        db.flush()
        for handler in self._subscribers.get(event_type, []):
            # A subscriber's own failure must never break the publisher's
            # transaction/flow (module isolation - task section 13: "module
            # B must not be able to accidentally break module A").
            try:
                handler(db, payload)
            except Exception:  # noqa: BLE001 - isolation boundary, log & continue
                import logging

                logging.getLogger(__name__).exception(
                    "Event subscriber failed for %s (source=%s)", event_type, source_module
                )


event_bus = _EventBus()
