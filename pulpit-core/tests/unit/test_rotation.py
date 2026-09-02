from datetime import datetime, timedelta, timezone

from app.modules.signing import rotation
from app.modules.signing.models import KeyState, SigningKey, SigningSettings

NOW = datetime(2026, 1, 1, tzinfo=timezone.utc)


def _key(**overrides) -> SigningKey:
    defaults = dict(
        state=KeyState.ACTIVE,
        key_id="ABCD1234",
        fingerprint="A" * 40,
        identity_name="Test",
        algorithm="rsa4096",
        public_key_armor="",
    )
    defaults.update(overrides)
    return SigningKey(**defaults)


def _settings(**overrides) -> SigningSettings:
    defaults = dict(
        auto_rotation_enabled=True,
        rotation_generate_before_days=90,
        rotation_activate_before_days=30,
        key_retention_days=180,
    )
    defaults.update(overrides)
    return SigningSettings(**defaults)


class TestShouldGenerateNext:
    def test_no_active_key_never_generates(self):
        settings = _settings()
        assert rotation.should_generate_next(None, None, settings, NOW) is False

    def test_far_from_expiry_does_not_generate(self):
        active = _key(expires_at=NOW + timedelta(days=200))
        assert rotation.should_generate_next(active, None, _settings(), NOW) is False

    def test_within_threshold_generates(self):
        active = _key(expires_at=NOW + timedelta(days=89))
        assert rotation.should_generate_next(active, None, _settings(), NOW) is True

    def test_does_not_generate_if_next_already_exists(self):
        active = _key(expires_at=NOW + timedelta(days=10))
        next_key = _key(state=KeyState.NEXT)
        assert rotation.should_generate_next(active, next_key, _settings(), NOW) is False

    def test_auto_rotation_disabled_never_generates(self):
        active = _key(expires_at=NOW + timedelta(days=1))
        assert rotation.should_generate_next(active, None, _settings(auto_rotation_enabled=False), NOW) is False

    def test_non_expiring_key_never_generates(self):
        active = _key(expires_at=None)
        assert rotation.should_generate_next(active, None, _settings(), NOW) is False


class TestShouldActivateNext:
    def test_no_next_key_never_activates(self):
        assert rotation.should_activate_next(_key(), None, _settings(), NOW) is False

    def test_bootstrap_no_active_key_activates_immediately(self):
        next_key = _key(state=KeyState.NEXT)
        assert rotation.should_activate_next(None, next_key, _settings(), NOW) is True

    def test_far_from_activation_threshold_waits(self):
        active = _key(expires_at=NOW + timedelta(days=60))
        next_key = _key(state=KeyState.NEXT)
        assert rotation.should_activate_next(active, next_key, _settings(), NOW) is False

    def test_within_activation_threshold_activates(self):
        active = _key(expires_at=NOW + timedelta(days=29))
        next_key = _key(state=KeyState.NEXT)
        assert rotation.should_activate_next(active, next_key, _settings(), NOW) is True


class TestShouldRetire:
    def test_no_retiring_at_never_retires(self):
        key = _key(state=KeyState.RETIRING, retiring_at=None)
        assert rotation.should_retire(key, _settings(), NOW) is False

    def test_within_retention_window_does_not_retire(self):
        key = _key(state=KeyState.RETIRING, retiring_at=NOW - timedelta(days=100))
        assert rotation.should_retire(key, _settings(key_retention_days=180), NOW) is False

    def test_past_retention_window_retires(self):
        key = _key(state=KeyState.RETIRING, retiring_at=NOW - timedelta(days=200))
        assert rotation.should_retire(key, _settings(key_retention_days=180), NOW) is True


def test_is_expiring_soon():
    key = _key(expires_at=NOW + timedelta(days=5))
    assert rotation.is_expiring_soon(key, warn_days=10, now=NOW) is True
    assert rotation.is_expiring_soon(key, warn_days=1, now=NOW) is False
