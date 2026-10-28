"""Run Alembic in a fresh interpreter so application imports cannot mask missing models."""

import os
import subprocess
import sys
from pathlib import Path


def test_alembic_keeps_task_retention_table(tmp_path):
    script = """
from alembic import command
from alembic.config import Config
from alembic.script import ScriptDirectory
from alembic.runtime.environment import EnvironmentContext
from alembic.autogenerate import compare_metadata

cfg = Config("alembic.ini")
command.upgrade(cfg, "head")
def check(revision, context):
    diffs = compare_metadata(context, context.opts["target_metadata"])
    for diff in diffs:
        if isinstance(diff, tuple) and diff[0] == "remove_table":
            assert diff[1].name != "task_retention_settings", "Alembic would delete task retention settings"
    assert "task_retention_settings" in context.opts["target_metadata"].tables
    return []
with EnvironmentContext(cfg, ScriptDirectory.from_config(cfg), fn=check):
    ScriptDirectory.from_config(cfg).run_env()
"""
    env = {**os.environ, "PULPIT_CORE_DATABASE_URL": f"sqlite:///{tmp_path}/migration.db"}
    result = subprocess.run(
        [sys.executable, "-c", script],
        cwd=Path(__file__).resolve().parents[2],
        env=env,
        text=True,
        capture_output=True,
        check=False,
    )
    assert result.returncode == 0, result.stdout + result.stderr
