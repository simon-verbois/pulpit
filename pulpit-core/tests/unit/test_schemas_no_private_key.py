"""Task section 4/15/16: "no private key returned from APIs" - enforced
structurally (private key material isn't a column anywhere - see
models.py), and verified here so a future refactor can't silently
reintroduce it without a test failing."""

from app.modules.signing.schemas import SigningKeyPublic, SigningKeyRead, SigningSettingsRead

_FORBIDDEN_SUBSTRINGS = ("private", "secret", "passphrase")


def _assert_no_sensitive_fields(model_cls) -> None:
    for field_name in model_cls.model_fields:
        lowered = field_name.lower()
        assert not any(bad in lowered for bad in _FORBIDDEN_SUBSTRINGS), (
            f"{model_cls.__name__}.{field_name} looks sensitive and must not be API-exposed"
        )


def test_signing_key_read_has_no_sensitive_fields():
    _assert_no_sensitive_fields(SigningKeyRead)


def test_signing_key_public_has_no_sensitive_fields():
    _assert_no_sensitive_fields(SigningKeyPublic)
    # Only the public export - explicitly not a private key field.
    assert set(SigningKeyPublic.model_fields) == {"fingerprint", "public_key_armor"}


def test_signing_settings_read_has_no_sensitive_fields():
    _assert_no_sensitive_fields(SigningSettingsRead)


def test_signing_key_model_has_no_private_key_column():
    from app.modules.signing.models import SigningKey

    column_names = {c.name for c in SigningKey.__table__.columns}
    assert not any("private" in name or "passphrase" in name for name in column_names)
