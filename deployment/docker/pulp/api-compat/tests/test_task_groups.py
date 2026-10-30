"""Dispatch completion tests in Pulp's actual Django environment."""

import os
import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

from pulpit_api_compat.app.task_groups import (
    finish_dispatch,
    wrap_acs_refresh,
    wrap_prune_dispatch,
)


class TaskGroupCompatibilityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        os.environ.setdefault("DJANGO_SETTINGS_MODULE", "pulpcore.app.settings")
        import django

        django.setup()

    def test_closes_prune_dispatch_only_after_the_original_returns(self):
        group = Mock(all_tasks_dispatched=False)

        def original():
            group.finish.assert_not_called()
            return "result"

        with patch("pulpcore.plugin.models.TaskGroup.current", return_value=group):
            self.assertEqual(wrap_prune_dispatch(original)(), "result")
        group.finish.assert_called_once()

    def test_dispatch_error_remains_an_error_and_closes_further_dispatch(self):
        group = Mock(all_tasks_dispatched=False)
        with patch("pulpcore.plugin.models.TaskGroup.current", return_value=group):
            with self.assertRaisesRegex(RuntimeError, "dispatch failed"):
                wrap_prune_dispatch(Mock(side_effect=RuntimeError("dispatch failed")))()
        group.finish.assert_called_once()

    def test_keeps_upstream_completed_groups_unchanged(self):
        group = Mock(all_tasks_dispatched=True)
        finish_dispatch(group)
        group.finish.assert_not_called()

    def test_refresh_closes_its_native_response_group(self):
        group = Mock(all_tasks_dispatched=False)
        response = SimpleNamespace(
            data={"task_group": "/pulp/api/v3/task-groups/owned/"}
        )
        with patch(
            "pulpcore.plugin.models.TaskGroup.objects.get", return_value=group
        ) as get:
            self.assertIs(wrap_acs_refresh(lambda: response)(), response)
        get.assert_called_once_with(pk="owned")
        group.finish.assert_called_once()
