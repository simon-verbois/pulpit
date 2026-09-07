from pathlib import Path

import pytest

from app.modules.signing.rpm_resign import _validate_gnupg_home


class TestGnupgHomeValidation:
    def test_accepts_normal_absolute_path(self):
        path = Path("/var/lib/pulpit-signing/gnupg")
        assert _validate_gnupg_home(path) == "/var/lib/pulpit-signing/gnupg"

    @pytest.mark.parametrize(
        "malicious",
        [
            "/var/lib/gnupg; rm -rf /",
            "/var/lib/gnupg`whoami`",
            "/var/lib/gnupg$(whoami)",
            "/var/lib/gnupg' --homedir /tmp/evil",
            '/var/lib/gnupg" --homedir /tmp/evil',
            "/var/lib/gnupg && echo pwned",
            "/var/lib/gnupg\ninjected",
            "not-an-absolute-path",
            "",
        ],
    )
    def test_rejects_unsafe_paths(self, malicious):
        with pytest.raises(ValueError):
            _validate_gnupg_home(Path(malicious))
