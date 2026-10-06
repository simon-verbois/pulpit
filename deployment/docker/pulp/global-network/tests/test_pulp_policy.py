"""Run in the derived Pulp image to cover the actual ULN downloader."""
import asyncio
import atexit
import os
import unittest
from importlib.util import find_spec
from pathlib import Path
from uuid import UUID

from test_policy import PolicyTests


@unittest.skipUnless(find_spec("django") and find_spec("pulp_rpm"), "requires the derived Pulp image")
class PulpPolicyTests(PolicyTests):
    def test_pulp_uln_login_and_metadata_ignore_old_remote_proxy_and_ca(self):
        import django
        from cryptography.fernet import Fernet
        key = Path(self.folder.name) / "database-test.key"
        key.write_bytes(Fernet.generate_key())
        os.environ["PULP_DB_ENCRYPTION_KEY"] = str(key)
        os.environ.setdefault("DJANGO_SETTINGS_MODULE", "pulpcore.app.settings")
        django.setup()
        from pulp_remote_check.app.views import _probe
        from pulp_rpm.app.models import UlnRemote

        async def check():
            remote = UlnRemote(
                name="global-network-test",
                url="uln://test-channel",
                uln_server_base_url=self.url.rsplit("/", 1)[0] + "/",
                username="dummy", password="dummy", pulp_domain_id=UUID(int=0),
                proxy_url="http://127.0.0.1:1", ca_cert=None,
            )
            head = await _probe(remote, remote.url + "/repodata/repomd.xml")
            self.assertIn(b"<repomd", head)
            self.assertEqual(remote.proxy_url, "http://127.0.0.1:1")
            await remote._download_factory._session.close()
            atexit.unregister(remote._download_factory._session_cleanup)
        asyncio.run(check())


if __name__ == "__main__":
    unittest.main()
