"""Apply the reference image's streaming download policy at image build time.

Fail on upstream changes rather than silently ship the old timeout behavior.
This affects the shared downloader factory, including plugin overrides such as ULN.
"""

from importlib.util import find_spec
from pathlib import Path


REPLACEMENTS = {
    "total=self._remote.total_timeout or default_timeout.total,": "total=None,",
    "sock_read=self._remote.sock_read_timeout or default_timeout.sock_read,":
        "sock_read=self._remote.sock_read_timeout or 300,",
}


def patch_source(source):
    for original, replacement in REPLACEMENTS.items():
        if source.count(original) != 1:
            raise RuntimeError(f"Unsupported pulpcore downloader factory: {original}")
        source = source.replace(original, replacement)
    return source


if __name__ == "__main__":
    package = find_spec("pulpcore")
    factory = Path(next(iter(package.submodule_search_locations))) / "download/factory.py"
    factory.write_text(patch_source(factory.read_text()))
