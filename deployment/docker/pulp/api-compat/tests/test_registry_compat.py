"""Native serializer regression tests; run inside the derived Pulp dev image."""

import os
import unittest
import uuid

from pulpit_api_compat.app.registry import (
    repair_registry_guard_field,
)


class RegistryGuardCompatibilityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        os.environ.setdefault("DJANGO_SETTINGS_MODULE", "pulpcore.app.settings")
        import django

        django.setup()
        from pulpcore.app.models import ContentRedirectContentGuard
        from pulp_container.app.serializers import ContainerDistributionSerializer
        from pulp_container.app.models import ContainerDistribution

        cls.guard_model = ContentRedirectContentGuard
        cls.serializer_type = ContainerDistributionSerializer
        cls.distribution_model = ContainerDistribution

    def test_native_patch_accepts_and_preserves_a_custom_redirect_guard(self):
        from rest_framework.request import Request
        from rest_framework.test import APIRequestFactory

        guard = self.guard_model.objects.create(
            name=f"e2e-gui-guard-{uuid.uuid4().hex}"
        )
        try:
            serializer = self.serializer_type(
                instance=self.distribution_model(name="e2e-gui-unsaved-instance"),
                partial=True,
                context={"request": Request(APIRequestFactory().patch("/"))},
            )
            result = serializer.run_validation(
                {
                    "content_guard": f"/pulp/api/v3/contentguards/core/content_redirect/{guard.pk}/"
                }
            )
            self.assertEqual(result["content_guard"].pk, guard.pk)
        finally:
            guard.delete()

    def test_leaves_upstream_corrected_fields_unchanged(self):
        serializer = self.serializer_type()
        field = serializer.fields["content_guard"]
        field.view_name = "future-upstream-route"
        repair_registry_guard_field(serializer)
        self.assertEqual(field.view_name, "future-upstream-route")

    def test_does_not_broaden_the_native_registry_guard_model(self):
        from pulpcore.app.models import HeaderContentGuard
        from rest_framework.exceptions import ValidationError
        from rest_framework.request import Request
        from rest_framework.test import APIRequestFactory

        guard = HeaderContentGuard.objects.create(
            name=f"e2e-gui-header-{uuid.uuid4().hex}",
            header_name="X-Test",
            header_value="fixture",
        )
        try:
            serializer = self.serializer_type(
                instance=self.distribution_model(name="e2e-gui-unsaved-instance"),
                partial=True,
                context={"request": Request(APIRequestFactory().patch("/"))},
            )
            with self.assertRaises(ValidationError):
                serializer.run_validation(
                    {
                        "content_guard": f"/pulp/api/v3/contentguards/core/header/{guard.pk}/"
                    }
                )
        finally:
            guard.delete()
