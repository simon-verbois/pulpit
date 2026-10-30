"""Atomic text-file replacement with permissions set before writing content."""

import os
import tempfile
from pathlib import Path


def atomic_write_text(path: Path, content: str, *, mode: int = 0o600) -> None:
    """Replace a file on the same filesystem without exposing a partial write.

    Each writer owns a unique temporary file. Private material is never
    created with the process umask's potentially broader permissions.
    """
    descriptor, name = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    temporary = Path(name)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            os.fchmod(handle.fileno(), mode)
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)
