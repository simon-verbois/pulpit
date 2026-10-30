"""Run inside the derived Pulp image alongside the opt-in live test."""

import asyncio
import importlib.util
import os
import time
import threading
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

FP = "A" * 40


@unittest.skipUnless(
    importlib.util.find_spec("pulpcore"), "requires Pulp's Python environment"
)
class PolicyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        os.environ.setdefault("DJANGO_SETTINGS_MODULE", "pulpcore.app.settings")
        import django

        django.setup()
        from pulp_rpm_signing_policy.app import policy

        cls.policy = policy

    def setUp(self):
        self.policy.verify_version.cache_clear()
        self.policy.verify_publication_content.cache_clear()

    def test_incomplete_configuration_fails_closed(self):
        for service, fingerprint in ((1, None), (None, FP)):
            with self.assertRaises(self.policy.SigningPolicyError):
                self.policy.fingerprint_for(
                    SimpleNamespace(
                        package_signing_service_id=service,
                        package_signing_fingerprint=fingerprint,
                    )
                )
        self.assertIsNone(
            self.policy.fingerprint_for(
                SimpleNamespace(
                    package_signing_service_id=None, package_signing_fingerprint=None
                )
            )
        )

    def test_normalizes_legacy_fingerprint(self):
        repo = SimpleNamespace(
            package_signing_service_id=1, package_signing_fingerprint=FP
        )
        self.assertEqual(self.policy.fingerprint_for(repo), "v4:" + FP)

    def test_failed_version_checks_are_retried_and_successes_cached_per_key(self):
        from pulpcore.plugin.models import RepositoryVersion

        query = MagicMock()
        query.values_list.return_value.iterator.side_effect = iter(
            [iter([None]), iter([["v4:" + FP]]), iter([["v4:" + FP]])]
        )
        with (
            patch.object(RepositoryVersion.objects, "get"),
            patch.object(self.policy, "packages_in", return_value=query) as packages,
        ):
            with self.assertRaises(self.policy.SigningPolicyError):
                self.policy.verify_version("version", "v4:" + FP)
            self.assertTrue(self.policy.verify_version("version", "v4:" + FP))
            self.assertTrue(self.policy.verify_version("version", "v4:" + FP))
            with self.assertRaises(self.policy.SigningPolicyError):
                self.policy.verify_version("version", "v4:" + "B" * 40)
            self.assertEqual(packages.call_count, 3)

    def test_checks_published_artifacts_not_only_version_membership(self):
        publication = MagicMock(repository_version_id="version")
        with (
            patch.object(
                self.policy.RpmPublication.objects, "get", return_value=publication
            ),
            patch.object(self.policy, "verify_version", return_value=True),
            patch.object(self.policy.Package.objects, "filter") as packages,
        ):
            packages.return_value.values_list.return_value.iterator.return_value = iter(
                [None]
            )
            with self.assertRaises(self.policy.SigningPolicyError):
                self.policy.verify_publication_content("publication", "v4:" + FP, None)

    def test_metadata_only_policy_requires_detached_signature(self):
        publication = MagicMock()
        publication.published_metadata.filter.return_value.exists.return_value = False
        with patch.object(
            self.policy.RpmPublication.objects, "get", return_value=publication
        ):
            with self.assertRaises(self.policy.SigningPolicyError):
                self.policy.verify_publication_content("publication", None, "service")
            publication.published_metadata.filter.return_value.exists.return_value = (
                True
            )
            self.assertTrue(
                self.policy.verify_publication_content("publication", None, "service")
            )

    def test_unsafe_response_never_reaches_cached_handler(self):
        from aiohttp import web
        from pulpcore.content.handler import Handler

        cached_handler = AsyncMock()
        with (
            patch.object(Handler, "_pulpit_signing_policy", False, create=True),
            patch.object(Handler, "stream_content", cached_handler),
            patch.object(
                self.policy,
                "check_delivery",
                side_effect=self.policy.SigningPolicyError("unsafe"),
            ),
        ):
            self.policy.install_content()
            installed = Handler.stream_content
            self.policy.install_content()
            self.assertIs(Handler.stream_content, installed)
            with self.assertRaises(web.HTTPServiceUnavailable) as raised:
                asyncio.run(Handler().stream_content(SimpleNamespace()))
            self.assertEqual(raised.exception.headers["Cache-Control"], "no-store")
            cached_handler.assert_not_called()

    def test_existing_content_guard_runs_before_signature_check(self):
        from aiohttp import web

        distro = MagicMock(spec=self.policy.RpmDistribution)
        handler = MagicMock()
        handler._match_distribution.return_value = distro
        handler._permit.side_effect = web.HTTPForbidden()
        request = SimpleNamespace(match_info={"path": "rpm/repo/pkg.rpm"})
        with patch.object(self.policy, "verify_publication") as verify:
            with self.assertRaises(web.HTTPForbidden):
                self.policy.check_delivery(handler, request)
            verify.assert_not_called()

    def test_failure_waits_for_other_signers_and_never_swaps_partial_results(self):
        version = MagicMock()
        repo = SimpleNamespace(
            package_signing_service_id=1,
            package_signing_fingerprint="v4:" + FP,
            package_signing_service=object(),
        )
        packages = [
            SimpleNamespace(
                signing_keys=None, number=i, pk=i, pkgId=str(i), checksum_type="sha256"
            )
            for i in range(4)
        ]
        barrier = threading.Barrier(3)
        completed = []

        def sign(package, *args):
            barrier.wait(timeout=2)
            if package.number == 0:
                raise self.policy.SigningPolicyError("signer failed")
            time.sleep(0.01)
            completed.append(package.number)
            return (str(package.number), "signed" + str(package.number))

        report = MagicMock()
        report.__enter__.return_value.aincrement = AsyncMock()
        with (
            patch.object(self.policy, "packages_in") as query,
            patch.object(self.policy, "sign_one", side_effect=sign),
            patch.object(self.policy, "ProgressReport", return_value=report),
            patch.object(
                self.policy.RpmPackageSigningResult.objects, "filter"
            ) as native_cache,
            patch.object(self.policy.Package.objects, "filter") as cached_packages,
            patch.object(self.policy.settings, "MAX_PACKAGE_SIGNING_WORKERS", 3),
        ):
            query.return_value.only.return_value.iterator.return_value = iter(packages)
            native_cache.return_value.values_list.return_value = []
            cached_packages.return_value.only.return_value = []
            with self.assertRaises(self.policy.SigningPolicyError):
                self.policy.prepare_version(repo, version)
            self.assertEqual(sorted(completed), [1, 2])
            version.remove_content.assert_not_called()
            version.add_content.assert_not_called()
            self.assertEqual(report.__enter__.return_value.aincrement.await_count, 2)

    def test_already_signed_content_does_not_download_or_sign_again(self):
        repo = SimpleNamespace(
            package_signing_service_id=1, package_signing_fingerprint="v4:" + FP
        )
        with (
            patch.object(self.policy, "packages_in") as query,
            patch.object(self.policy, "sign_one") as sign,
        ):
            query.return_value.only.return_value.iterator.return_value = iter(
                [SimpleNamespace(signing_keys=["v4:" + FP])]
            )
            self.policy.prepare_version(repo, MagicMock())
            sign.assert_not_called()

    def test_on_demand_download_uses_native_remote_and_declared_checksum(self):
        package = SimpleNamespace(
            pkgId="expected", checksum_type="sha256", size_package=123
        )
        factory = SimpleNamespace(
            _session=SimpleNamespace(close=AsyncMock()), _session_cleanup=lambda: None
        )
        downloader = SimpleNamespace(
            run=AsyncMock(return_value=SimpleNamespace(path=Path("/tmp/rpm")))
        )
        remote = SimpleNamespace(
            download_factory=factory, get_downloader=MagicMock(return_value=downloader)
        )
        source = MagicMock()
        source.remote.cast.return_value = remote
        ca = MagicMock(artifact_id=None)
        ca.remoteartifact_set.select_related.return_value.all.return_value = [source]
        artifact = MagicMock()
        with (
            patch.object(
                self.policy.ContentArtifact.objects, "select_related"
            ) as query,
            patch.object(
                self.policy.Artifact, "init_and_validate", return_value=artifact
            ) as validate,
        ):
            query.return_value.get.return_value = ca
            self.assertIs(self.policy.materialize(package), artifact)
            validate.assert_called_once_with(
                "/tmp/rpm", expected_digests={"sha256": "expected"}, expected_size=123
            )
            remote.get_downloader.assert_called_once_with(source)
            factory._session.close.assert_awaited_once()
            ca.save.assert_called_once_with(update_fields=["artifact"])

    def test_native_cache_reuse_precedes_any_artifact_read(self):
        repo = SimpleNamespace(
            package_signing_service_id=1,
            package_signing_fingerprint="v4:" + FP,
            package_signing_service=object(),
        )
        version = MagicMock()
        pending = SimpleNamespace(
            pk="original", pkgId="sha256", checksum_type="sha256", signing_keys=None
        )
        signed = SimpleNamespace(pk="signed", signing_keys=["v4:" + FP])
        report = MagicMock()
        with (
            patch.object(self.policy, "packages_in") as query,
            patch.object(
                self.policy.RpmPackageSigningResult.objects, "filter"
            ) as cache,
            patch.object(self.policy.Package.objects, "filter") as packages,
            patch.object(self.policy, "ProgressReport", return_value=report),
            patch.object(self.policy, "sign_one") as sign,
        ):
            query.return_value.only.return_value.iterator.return_value = iter([pending])
            cache.return_value.values_list.return_value = [("sha256", "signed")]
            packages.return_value.only.return_value = [signed]
            self.policy.prepare_version(repo, version)
            sign.assert_not_called()
            report.__enter__.return_value.increase_by.assert_called_once_with(1)
            version.remove_content.assert_called_once()
            version.add_content.assert_called_once()
