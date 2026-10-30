import os
import stat
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from unittest.mock import patch

import pytest

from app.core.files import atomic_write_text


def test_private_permissions_exist_before_content_is_written(tmp_path):
    target = tmp_path / "private.pem"
    replace = os.replace
    chmod = os.fchmod
    sizes_before_mode = []

    def secure(descriptor, mode):
        sizes_before_mode.append(os.fstat(descriptor).st_size)
        chmod(descriptor, mode)
    observed = []

    def inspect(source, destination):
        observed.append(stat.S_IMODE(Path(source).stat().st_mode))
        replace(source, destination)

    previous_umask = os.umask(0)
    try:
        with patch("app.core.files.os.replace", side_effect=inspect), patch("app.core.files.os.fchmod", side_effect=secure):
            atomic_write_text(target, "private test content")
    finally:
        os.umask(previous_umask)
    assert sizes_before_mode == [0]
    assert observed == [0o600]
    assert stat.S_IMODE(target.stat().st_mode) == 0o600
    assert target.read_text() == "private test content"


def test_failed_replacement_preserves_original_and_removes_temporary_file(tmp_path):
    target = tmp_path / "key.pem"
    target.write_text("original")
    with patch("app.core.files.os.replace", side_effect=OSError("write failed")):
        with pytest.raises(OSError, match="write failed"):
            atomic_write_text(target, "replacement")
    assert target.read_text() == "original"
    assert list(tmp_path.iterdir()) == [target]


def test_concurrent_writers_never_share_a_temporary_file(tmp_path):
    target = tmp_path / "manifest.json"
    contents = [str(index) * 10000 for index in range(12)]
    with ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(lambda text: atomic_write_text(target, text, mode=0o644), contents))
    assert target.read_text() in contents
    assert stat.S_IMODE(target.stat().st_mode) == 0o644
    assert list(tmp_path.iterdir()) == [target]
