"""Resolves a package's real, servable path within a published RPM
repository.

VERIFIED live (docs/signing.md "How resigning actually downloads a
package"): a `rpm.Package` content unit's own `location_href` field is
**not** reliable for this - the default repository layout actually serves
packages at `Packages/<first-letter>/<filename>`, which only exists in the
repository's own generated `primary.xml.gz`. This mirrors exactly what a
real `dnf`/`createrepo`-compatible client does: read `repomd.xml` to find
`primary.xml.gz`, then read that to map a package's checksum to its real
`location/@href` - never guess or reconstruct the layout independently.
"""

import gzip
from xml.etree import ElementTree

from app.adapters.pulp.client import PulpClient
from app.adapters.pulp.exceptions import PulpAdapterError

_REPOMD_NS = {"repo": "http://linux.duke.edu/metadata/repo"}
_PRIMARY_NS = {"common": "http://linux.duke.edu/metadata/common"}


def build_checksum_to_location_map(pulp: PulpClient, distribution_base_url: str) -> dict[str, str]:
    """Returns `{sha256_checksum: location_href}` for every package in the
    distribution's currently-published repomd.xml/primary.xml.gz."""
    base = distribution_base_url.rstrip("/")
    repomd_bytes = pulp.get_content_bytes(f"{base}/repodata/repomd.xml")
    repomd = ElementTree.fromstring(repomd_bytes)

    primary_data = repomd.find("repo:data[@type='primary']", _REPOMD_NS)
    if primary_data is None:
        raise PulpAdapterError("repomd.xml has no 'primary' metadata entry")
    location = primary_data.find("repo:location", _REPOMD_NS)
    if location is None or "href" not in location.attrib:
        raise PulpAdapterError("repomd.xml's primary entry has no location href")

    primary_gz = pulp.get_content_bytes(f"{base}/{location.attrib['href']}")
    primary_xml = gzip.decompress(primary_gz)
    root = ElementTree.fromstring(primary_xml)

    mapping: dict[str, str] = {}
    for package in root.findall("common:package", _PRIMARY_NS):
        checksum_el = package.find("common:checksum", _PRIMARY_NS)
        location_el = package.find("common:location", _PRIMARY_NS)
        if checksum_el is None or checksum_el.text is None or location_el is None:
            continue
        href = location_el.attrib.get("href")
        if href:
            mapping[checksum_el.text] = href
    return mapping
