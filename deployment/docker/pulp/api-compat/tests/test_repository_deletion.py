"""Native deletion tests on owned dev fixtures; never flush the Pulp database."""

import os
import unittest
import uuid
from unittest.mock import patch


class RepositoryDeletionPolicyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        os.environ.setdefault("DJANGO_SETTINGS_MODULE", "pulpcore.app.settings")
        import django

        django.setup()
        from pulpcore.app.models import HeaderContentGuard
        from pulp_file.app.models import (
            FileDistribution,
            FilePublication,
            FileRepository,
        )

        cls.repository_model = FileRepository
        cls.distribution_model = FileDistribution
        cls.publication_model = FilePublication
        cls.guard_model = HeaderContentGuard

    def setUp(self):
        self.prefix = f"e2e-gui-delete-{uuid.uuid4().hex}"
        self.repositories = []
        self.distributions = []
        self.guards = []

    def tearDown(self):
        for pk in self.distributions:
            obj = self.distribution_model.objects.filter(pk=pk).first()
            if obj:
                obj.delete()
        for pk in self.repositories:
            obj = self.repository_model.objects.filter(pk=pk).first()
            if obj:
                obj.delete()
        for pk in self.guards:
            self.guard_model.objects.filter(pk=pk).delete()

    def repository(self, suffix):
        obj = self.repository_model.objects.create(name=f"{self.prefix}-{suffix}")
        self.repositories.append(obj.pk)
        return obj

    def distribution(self, suffix, **target):
        obj = self.distribution_model.objects.create(
            name=f"{self.prefix}-{suffix}",
            base_path=f"file/{self.prefix}-{suffix}",
            **target,
        )
        self.distributions.append(obj.pk)
        return obj

    def test_deletes_direct_and_pinned_urls_but_preserves_other_targets_and_guards(
        self,
    ):
        repo = self.repository("owned")
        other = self.repository("other")
        guard = self.guard_model.objects.create(
            name=self.prefix, header_name="X-Fixture", header_value="fixture"
        )
        self.guards.append(guard.pk)
        version = repo.latest_version()
        publication = self.publication_model.objects.create(
            repository_version=version, complete=True
        )
        owned = [
            self.distribution("latest", repository=repo, content_guard=guard),
            self.distribution("version", repository_version=version),
            self.distribution("publication", publication=publication),
        ]
        others = [
            self.distribution("other", repository=other, content_guard=guard),
            self.distribution("unused"),
        ]
        repo.delete()
        self.assertFalse(
            self.distribution_model.objects.filter(
                pk__in=[d.pk for d in owned]
            ).exists()
        )
        self.assertEqual(
            self.distribution_model.objects.filter(
                pk__in=[d.pk for d in others]
            ).count(),
            2,
        )
        self.assertTrue(self.repository_model.objects.filter(pk=other.pk).exists())
        self.assertTrue(self.guard_model.objects.filter(pk=guard.pk).exists())

    def test_failure_rolls_back_distribution_and_repository_deletion_together(self):
        repo = self.repository("rollback")
        first = self.distribution("first", repository=repo)
        second = self.distribution("second", repository=repo)
        original = self.distribution_model.delete
        calls = 0

        def fail_second(instance, **kwargs):
            nonlocal calls
            calls += 1
            if calls == 2:
                raise RuntimeError("Controlled deletion failure")
            return original(instance, **kwargs)

        repo_pk = repo.pk
        with patch.object(self.distribution_model, "delete", fail_second):
            with self.assertRaisesRegex(RuntimeError, "Controlled deletion failure"):
                repo.delete()
        self.assertTrue(self.repository_model.objects.filter(pk=repo_pk).exists())
        self.assertEqual(
            self.distribution_model.objects.filter(
                pk__in=[first.pk, second.pk]
            ).count(),
            2,
        )

    def test_deleting_one_url_does_not_apply_reverse_cascade_to_file_repository(self):
        repo = self.repository("one-url")
        first = self.distribution("one-url", repository=repo)
        second = self.distribution("remaining-url", repository=repo)
        first.delete()
        self.assertTrue(self.repository_model.objects.filter(pk=repo.pk).exists())
        self.assertTrue(self.distribution_model.objects.filter(pk=second.pk).exists())
