import gzip

import httpx
import respx

from app.adapters.pulp.client import PulpClient
from app.core.config import Settings
from app.modules.signing.repo_metadata import build_checksum_to_location_map

REPOMD_XML = b"""<?xml version="1.0" encoding="UTF-8"?>
<repomd xmlns="http://linux.duke.edu/metadata/repo">
  <data type="primary">
    <checksum type="sha256">deadbeef</checksum>
    <location href="repodata/abc-primary.xml.gz"/>
  </data>
</repomd>
"""

PRIMARY_XML = b"""<?xml version="1.0" encoding="UTF-8"?>
<metadata xmlns="http://linux.duke.edu/metadata/common" xmlns:rpm="http://linux.duke.edu/metadata/rpm" packages="1">
<package type="rpm">
  <name>zebra</name>
  <checksum type="sha256" pkgid="YES">7aa66335d8ebc295d626abc0639135ff6dec6333d4e94e0da69ed720c5fdd5f0</checksum>
  <location href="Packages/z/zebra-0.1-2.noarch.rpm"/>
</package>
</metadata>
"""


@respx.mock
def test_build_checksum_to_location_map_reads_real_repo_layout():
    """VERIFIED against a live instance (docs/signing.md): the real path is
    Packages/<letter>/<file>, not the content unit's own location_href."""
    respx.get("http://pulp-test/pulp/content/test-dist/repodata/repomd.xml").mock(
        return_value=httpx.Response(200, content=REPOMD_XML)
    )
    respx.get("http://pulp-test/pulp/content/test-dist/repodata/abc-primary.xml.gz").mock(
        return_value=httpx.Response(200, content=gzip.compress(PRIMARY_XML))
    )

    client = PulpClient(Settings(pulp_base_url="http://pulp-test"))
    mapping = build_checksum_to_location_map(client, "/pulp/content/test-dist/")

    assert mapping == {
        "7aa66335d8ebc295d626abc0639135ff6dec6333d4e94e0da69ed720c5fdd5f0": "Packages/z/zebra-0.1-2.noarch.rpm"
    }


@respx.mock
def test_build_checksum_to_location_map_handles_trailing_slash_variants():
    respx.get("http://pulp-test/pulp/content/test-dist/repodata/repomd.xml").mock(
        return_value=httpx.Response(200, content=REPOMD_XML)
    )
    respx.get("http://pulp-test/pulp/content/test-dist/repodata/abc-primary.xml.gz").mock(
        return_value=httpx.Response(200, content=gzip.compress(PRIMARY_XML))
    )

    client = PulpClient(Settings(pulp_base_url="http://pulp-test"))
    # No trailing slash this time - must still resolve to the same URLs.
    mapping = build_checksum_to_location_map(client, "/pulp/content/test-dist")

    assert len(mapping) == 1
