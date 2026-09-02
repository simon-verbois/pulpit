"""Regression test for a real bug caught live (docs/signing.md): SigningKey's
datetime columns were missing `DateTime(timezone=True)`, so a key reloaded
from a fresh session had naive `expires_at`/`retiring_at` values -
comparing them against `datetime.now(timezone.utc)` in rotation.py's pure
threshold functions raised "can't compare offset-naive and offset-aware
datetimes" the first time pulpit-worker's scheduler actually evaluated a
real key with a real expiry.

This is deliberately an INTEGRATION test, not a unit test: test_rotation.py
constructs SigningKey objects in memory and never round-trips them through
Postgres, which is exactly why that bug slipped past it - only a real
commit + fresh read from the database reproduces the naive-datetime
behavior a driver actually returns.
"""

from datetime import timedelta

from app.modules.signing import rotation, service
from app.modules.signing.models import KeyState, SigningKey


def test_expires_at_survives_a_real_db_roundtrip_as_timezone_aware(db):
    now = rotation.utcnow()
    key = SigningKey(
        state=KeyState.ACTIVE,
        key_id="AAAA",
        fingerprint="A" * 40,
        identity_name="Test",
        algorithm="rsa4096",
        public_key_armor="x",
        expires_at=now + timedelta(days=10),
    )
    db.add(key)
    db.commit()
    db.expire_all()  # force a real re-read from Postgres, not the identity map's cached Python object

    reloaded = service.get_key(db, key.id)
    assert reloaded.expires_at.tzinfo is not None

    settings_row = service.get_settings_row(db)
    settings_row.auto_rotation_enabled = True
    settings_row.rotation_generate_before_days = 90
    db.flush()

    # The actual regression: this raised TypeError before the fix.
    assert rotation.should_generate_next(reloaded, None, settings_row, now) is True


def test_retiring_at_survives_a_real_db_roundtrip_as_timezone_aware(db):
    now = rotation.utcnow()
    key = SigningKey(
        state=KeyState.RETIRING,
        key_id="BBBB",
        fingerprint="B" * 40,
        identity_name="Test",
        algorithm="rsa4096",
        public_key_armor="x",
        retiring_at=now - timedelta(days=200),
    )
    db.add(key)
    db.commit()
    db.expire_all()  # force a real re-read from Postgres, not the identity map's cached Python object

    reloaded = service.get_key(db, key.id)
    assert reloaded.retiring_at.tzinfo is not None

    settings_row = service.get_settings_row(db)
    settings_row.key_retention_days = 180
    db.flush()

    assert rotation.should_retire(reloaded, settings_row, now) is True
