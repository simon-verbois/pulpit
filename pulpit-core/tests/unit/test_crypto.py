import pytest
from cryptography.fernet import Fernet, InvalidToken

from app.core import crypto


class TestEncryptDecryptRoundTrip:
    def test_round_trips_a_value(self):
        token = crypto.encrypt_secret("s3cret-proxy-password")
        assert crypto.decrypt_secret(token) == "s3cret-proxy-password"

    def test_ciphertext_never_contains_the_plaintext(self):
        token = crypto.encrypt_secret("s3cret-proxy-password")
        assert "s3cret-proxy-password" not in token

    def test_decrypting_with_a_different_key_raises_invalid_token(self, monkeypatch):
        token = crypto.encrypt_secret("s3cret-proxy-password")
        crypto._fernet.cache_clear()
        monkeypatch.setenv("PULPIT_CORE_SECRET_KEY", Fernet.generate_key().decode())
        crypto.get_settings.cache_clear()
        try:
            with pytest.raises(InvalidToken):
                crypto.decrypt_secret(token)
        finally:
            crypto._fernet.cache_clear()
            crypto.get_settings.cache_clear()


class TestMissingSecretKey:
    def test_raises_a_clear_error_when_unset(self, monkeypatch):
        crypto._fernet.cache_clear()
        monkeypatch.setenv("PULPIT_CORE_SECRET_KEY", "")
        crypto.get_settings.cache_clear()
        try:
            with pytest.raises(crypto.SecretKeyNotConfigured):
                crypto.encrypt_secret("anything")
        finally:
            crypto._fernet.cache_clear()
            crypto.get_settings.cache_clear()
