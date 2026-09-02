"""Real GPG integration path (task section 16: "add at least one realistic
integration path if practical") - actually shells out to the real `gpg`
binary pulpit-worker's image ships, with no mocking. Slower than the rest
of the suite; skipped automatically if `gpg` isn't on PATH (e.g. a minimal
CI image building only the API image)."""

import shutil
import tempfile
from pathlib import Path

import pytest

from app.modules.signing.gpg_local import GPGOperationError, LocalGPGKeyManager

pytestmark = pytest.mark.skipif(shutil.which("gpg") is None, reason="gpg binary not available")


@pytest.fixture
def manager():
    with tempfile.TemporaryDirectory() as tmp:
        yield LocalGPGKeyManager(Path(tmp) / "gnupg")


def test_generate_export_and_inspect_round_trip(manager):
    generated = manager.generate_key(
        identity_name="Pulpit Test Signing Key",
        identity_email="signing@example.org",
        algorithm="rsa2048",  # smaller/faster than production's rsa4096 default
        validity_days=30,
    )
    assert len(generated.fingerprint) == 40
    assert generated.public_key_armor.startswith("-----BEGIN PGP PUBLIC KEY BLOCK-----")

    exported = manager.export_public_key(generated.fingerprint)
    assert exported == generated.public_key_armor

    assert generated.expires_at is not None
    assert (generated.expires_at - generated.created_at).days in (29, 30, 31)


def test_generate_with_no_expiration(manager):
    generated = manager.generate_key(
        identity_name="Pulpit Test Signing Key",
        identity_email="",
        algorithm="rsa2048",
        validity_days=None,
    )
    assert generated.expires_at is None


def test_extend_expiration(manager):
    generated = manager.generate_key(
        identity_name="Pulpit Test Signing Key",
        identity_email="",
        algorithm="rsa2048",
        validity_days=30,
    )
    new_expiry = manager.extend_expiration(generated.fingerprint, 365)
    assert new_expiry is not None
    assert new_expiry > generated.expires_at


def test_export_unknown_fingerprint_raises(manager):
    with pytest.raises(GPGOperationError):
        manager.export_public_key("F" * 40)


def test_rejects_unsafe_identity_name(manager):
    with pytest.raises(ValueError):
        manager.generate_key(
            identity_name="evil\nComment: injected",
            identity_email="",
            algorithm="rsa2048",
            validity_days=30,
        )
