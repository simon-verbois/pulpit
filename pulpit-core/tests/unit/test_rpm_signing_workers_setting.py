"""`Settings.rpm_signing_workers` (app/core/config/settings.py) - the
ThreadPoolExecutor size `resign_repository_packages_job` uses for parallel
download/rpmsign/upload (jobs.py). Defaults to 8, overridable via
`PULPIT_CORE_RPM_SIGNING_WORKERS`, and must never be allowed down to 0 (a
pool of size 0 would silently hang the job forever instead of failing
loudly)."""

import pytest
from pydantic import ValidationError

from app.core.config.settings import Settings


def test_rpm_signing_workers_defaults_to_eight(monkeypatch):
    monkeypatch.delenv("PULPIT_CORE_RPM_SIGNING_WORKERS", raising=False)
    assert Settings().rpm_signing_workers == 8


def test_rpm_signing_workers_overridable_via_env(monkeypatch):
    monkeypatch.setenv("PULPIT_CORE_RPM_SIGNING_WORKERS", "16")
    assert Settings().rpm_signing_workers == 16


def test_rpm_signing_workers_rejects_zero_and_below(monkeypatch):
    monkeypatch.setenv("PULPIT_CORE_RPM_SIGNING_WORKERS", "0")
    with pytest.raises(ValidationError):
        Settings()
