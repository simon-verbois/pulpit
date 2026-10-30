"""Run in the derived Pulp image to cover the actual ULN downloader."""

import asyncio
import atexit
import os
import unittest
from importlib.util import find_spec
from pathlib import Path
from uuid import UUID

import test_policy


@unittest.skipUnless(
    find_spec("django") and find_spec("pulp_rpm"), "requires the derived Pulp image"
)
class PulpPolicyTests(test_policy.PolicyTests):
    def test_native_rpm_and_uln_saved_tls_exceptions_cover_probe_and_login(self):
        import django
        from pulpit_egress import publish, read_policy

        os.environ.setdefault("DJANGO_SETTINGS_MODULE", "pulpcore.app.settings")
        django.setup()
        from pulp_remote_check.app.views import _probe
        from pulp_rpm.app.models import RpmRemote, UlnRemote

        policy = read_policy()
        policy["ca_cert"] = None
        publish(policy)

        async def check():
            for model in (RpmRemote, UlnRemote):
                remote = model(
                    name="remote-tls-fixture",
                    tls_validation=False,
                    url=self.url if model is RpmRemote else "uln://fixture-channel",
                    pulp_domain_id=UUID(int=0),
                    max_retries=1,
                    **(
                        {
                            "uln_server_base_url": self.url.rsplit("/", 1)[0] + "/",
                            "username": "dummy",
                            "password": "dummy",
                        }
                        if model is UlnRemote
                        else {}
                    ),
                )
                try:
                    head = await _probe(remote, remote.url + "/repodata/repomd.xml")
                    self.assertIn(b"<repomd", head)
                    self.assertFalse(remote.tls_validation)
                finally:
                    await remote._download_factory._session.close()
                    atexit.unregister(remote._download_factory._session_cleanup)
            self.assertTrue(read_policy()["tls_validation"])

        asyncio.run(check())

    def test_uln_tls_opt_out_also_covers_internal_https_login(self):
        import django
        from pulpit_egress import read_policy

        os.environ.setdefault("DJANGO_SETTINGS_MODULE", "pulpcore.app.settings")
        django.setup()
        from pulp_remote_check.app.views import _probe
        from pulp_rpm.app.models import UlnRemote

        async def check():
            remote = UlnRemote(
                name="local-uln-tls-fixture",
                tls_validation=False,
                url="uln://fixture-channel",
                pulp_domain_id=UUID(int=0),
                max_retries=1,
                uln_server_base_url=f"https://127.0.0.1:{self.origin.server_port}/",
                username="dummy",
                password="dummy",
            )
            try:
                head = await _probe(remote, remote.url + "/repodata/repomd.xml")
                self.assertIn(b"<repomd", head)
            finally:
                await remote._download_factory._session.close()
                atexit.unregister(remote._download_factory._session_cleanup)
            self.assertTrue(read_policy()["tls_validation"])

        asyncio.run(check())

    def test_ansible_git_scopes_tls_exception_during_clone_and_resets_on_error(self):
        import django
        from types import SimpleNamespace
        from unittest.mock import patch
        from pulpit_egress import environment, read_policy

        os.environ.setdefault("DJANGO_SETTINGS_MODULE", "pulpcore.app.settings")
        django.setup()
        from pulp_ansible.app.tasks import collections

        class StopClone(Exception):
            pass

        def clone(*args, **kwargs):
            self.assertFalse(read_policy()["tls_validation"])
            self.assertEqual(environment(read_policy())["GIT_SSL_NO_VERIFY"], "true")
            raise StopClone()

        async def check():
            with patch.object(collections.Repo, "clone_from", clone):
                with self.assertRaises(StopClone):
                    await collections.declarative_content_from_git_repo(
                        SimpleNamespace(tls_validation=False),
                        "https://origin.test/fixture.git",
                    )
            self.assertTrue(read_policy()["tls_validation"])

        asyncio.run(check())

    def test_file_git_tls_exception_is_scoped_to_its_child_environment(self):
        import django
        from types import SimpleNamespace
        from pulpit_egress import environment, read_policy

        os.environ.setdefault("DJANGO_SETTINGS_MODULE", "pulpcore.app.settings")
        django.setup()
        from pulp_file.app.tasks.synchronizing import _build_clone_env

        remote = SimpleNamespace(
            tls_validation=False,
            proxy_url=None,
            ca_cert=None,
            client_cert=None,
            client_key=None,
            username=None,
            password=None,
        )
        values = environment(read_policy(), _build_clone_env(remote))
        self.assertEqual(values["GIT_SSL_NO_VERIFY"], "true")
        self.assertEqual(values["PULPIT_REMOTE_TLS_SKIP"], "1")
        self.assertTrue(read_policy()["tls_validation"])

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
                username="dummy",
                password="dummy",
                pulp_domain_id=UUID(int=0),
                proxy_url="http://127.0.0.1:1",
                ca_cert=None,
            )
            head = await _probe(remote, remote.url + "/repodata/repomd.xml")
            self.assertIn(b"<repomd", head)
            self.assertEqual(remote.proxy_url, "http://127.0.0.1:1")
            await remote._download_factory._session.close()
            atexit.unregister(remote._download_factory._session_cleanup)

        asyncio.run(check())


if __name__ == "__main__":
    unittest.main()
