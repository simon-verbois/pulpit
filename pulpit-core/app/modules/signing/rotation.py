"""Pure rotation policy logic (task section 6) - no I/O, no GPG, no Pulp
calls, so it's cheaply unit-testable and the one place the actual
thresholds live. jobs.py's `rotation_check` calls these functions and turns
a `True` into a follow-up job; it never re-implements the threshold math.

Lifecycle (task section 6):

    ACTIVE key nears expiry
        -> generate_before_days out:  generate a NEXT key
        -> activate_before_days out:  activate NEXT (old ACTIVE -> RETIRING)
    RETIRING key
        -> key_retention_days after retiring_at: RETIRED
"""

from datetime import datetime, timedelta, timezone

from app.modules.signing.models import SigningKey, SigningSettings


def should_generate_next(
    active_key: SigningKey | None, next_key: SigningKey | None, settings: SigningSettings, now: datetime
) -> bool:
    if not settings.auto_rotation_enabled or next_key is not None:
        return False
    if active_key is None:
        # No active key at all yet - handled by the "no key exists" bootstrap
        # path in jobs.py, not rotation. Nothing to rotate away from.
        return False
    if active_key.expires_at is None:
        return False  # non-expiring key - nothing to rotate on a schedule
    return active_key.expires_at - timedelta(days=settings.rotation_generate_before_days) <= now


def should_activate_next(
    active_key: SigningKey | None, next_key: SigningKey | None, settings: SigningSettings, now: datetime
) -> bool:
    if next_key is None:
        return False
    if active_key is None:
        return True  # bootstrap: nothing active yet, first key goes live immediately
    if active_key.expires_at is None:
        return False
    return active_key.expires_at - timedelta(days=settings.rotation_activate_before_days) <= now


def should_retire(retiring_key: SigningKey, settings: SigningSettings, now: datetime) -> bool:
    if retiring_key.retiring_at is None:
        return False
    return retiring_key.retiring_at + timedelta(days=settings.key_retention_days) <= now


def is_expiring_soon(key: SigningKey, warn_days: int, now: datetime) -> bool:
    if key.expires_at is None:
        return False
    return key.expires_at - timedelta(days=warn_days) <= now


def utcnow() -> datetime:
    return datetime.now(timezone.utc)
