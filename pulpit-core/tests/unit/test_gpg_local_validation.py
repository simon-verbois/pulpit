import pytest

from app.modules.signing.gpg_local import (
    _build_uid,
    _validate_algorithm,
    _validate_identity_email,
    _validate_identity_name,
    validate_fingerprint,
)


class TestIdentityNameValidation:
    def test_accepts_normal_name(self):
        assert _validate_identity_name("Pulp Repository Signing Key") == "Pulp Repository Signing Key"

    @pytest.mark.parametrize(
        "malicious",
        [
            "",
            "a" * 300,
            "Name\nComment: injected",
            "Name; rm -rf /",
            "Name`whoami`",
            "Name$(whoami)",
        ],
    )
    def test_rejects_unsafe_names(self, malicious):
        with pytest.raises(ValueError):
            _validate_identity_name(malicious)


class TestEmailValidation:
    def test_empty_is_allowed(self):
        assert _validate_identity_email("") == ""

    def test_accepts_valid_email(self):
        assert _validate_identity_email("signing@example.org") == "signing@example.org"

    @pytest.mark.parametrize("malicious", ["not-an-email", "a@b", "a b@c.com", "a@b.com\ninjected"])
    def test_rejects_invalid_email(self, malicious):
        with pytest.raises(ValueError):
            _validate_identity_email(malicious)


class TestAlgorithmValidation:
    def test_accepts_allowed_algorithms(self):
        assert _validate_algorithm("rsa4096") == "rsa4096"

    def test_rejects_unknown_algorithm(self):
        with pytest.raises(ValueError):
            _validate_algorithm("rsa4096; --delete-keys")


class TestFingerprintValidation:
    def test_accepts_40_hex_chars(self):
        fp = "A" * 40
        assert validate_fingerprint(fp) == fp

    @pytest.mark.parametrize("bad", ["short", "Z" * 40, "A" * 39, "A" * 41, "../../etc/passwd"])
    def test_rejects_non_fingerprints(self, bad):
        with pytest.raises(ValueError):
            validate_fingerprint(bad)


def test_build_uid_with_email():
    assert _build_uid("Pulp Key", "signing@example.org") == "Pulp Key <signing@example.org>"


def test_build_uid_without_email():
    assert _build_uid("Pulp Key", "") == "Pulp Key"
