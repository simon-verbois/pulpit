import unittest

from pulp_distribution_path_policy.policy import (
    distribution_path_error,
    required_prefix_for_model,
)


class DistributionPathPolicyTests(unittest.TestCase):
    def test_maps_every_supported_plugin_to_its_public_namespace(self):
        expected = {
            "pulp_ansible.app.models": "ansible/",
            "pulp_container.app.models": "container/",
            "pulp_deb.app.models.publication": "deb/",
            "pulp_file.app.models": "file/",
            "pulp_gem.app.models": "gem/",
            "pulp_hugging_face.app.models": "hugging-face/",
            "pulp_maven.app.models": "maven/",
            "pulp_npm.app.models": "npm/",
            "pulp_ostree.app.models": "ostree/",
            "pulp_python.app.models": "python/",
            "pulp_rpm.app.models.repository": "rpm/",
        }

        for model_module, prefix in expected.items():
            with self.subTest(model_module=model_module):
                model_name = model_module.rsplit(".", 1)[-1]
                self.assertEqual(required_prefix_for_model(model_module, model_name), prefix)

    def test_maps_core_distribution_models(self):
        self.assertEqual(
            required_prefix_for_model("pulpcore.app.models.openpgp", "OpenPGPDistribution"),
            "openpgp/",
        )
        self.assertEqual(
            required_prefix_for_model("pulpcore.app.models.publication", "ArtifactDistribution"),
            "artifact/",
        )

    def test_accepts_a_scoped_path_with_a_non_empty_suffix(self):
        self.assertIsNone(
            distribution_path_error("pulp_rpm.app.models", "RpmDistribution", "rpm/rhel-9")
        )

    def test_rejects_missing_wrong_or_empty_prefix(self):
        for path in ("rhel-9", "deb/rhel-9", "rpm/"):
            with self.subTest(path=path):
                self.assertEqual(
                    distribution_path_error("pulp_rpm.app.models", "RpmDistribution", path),
                    "Base path must start with 'rpm/' and include a name after it.",
                )

    def test_leaves_non_plugin_core_distributions_unchanged(self):
        self.assertIsNone(
            distribution_path_error("unrelated.app.models", "Distribution", "unscoped")
        )


if __name__ == "__main__":
    unittest.main()
