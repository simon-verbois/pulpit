from unittest.mock import MagicMock

from app.adapters.pulp.executor import CommandResult, ExecutorUnavailableError
from app.modules.trusted_ca import jobs as trusted_ca_jobs
from app.modules.trusted_ca.models import TrustedCaCertificate, TrustedCaStatus


def _make_cert(db, name="corp-proxy", status=TrustedCaStatus.PENDING):
    row = TrustedCaCertificate(
        name=name,
        pem="-----BEGIN CERTIFICATE-----\nAA==\n-----END CERTIFICATE-----\n",
        status=status,
    )
    db.add(row)
    db.flush()
    return row


def test_sync_job_leaves_rows_pending_when_no_executor_configured(db):
    row = _make_cert(db)

    result = trusted_ca_jobs.sync_job(db, {})

    assert result["executor_configured"] is False
    db.refresh(row)
    assert row.status == TrustedCaStatus.PENDING


def test_sync_job_marks_rows_applied_on_success(db, monkeypatch):
    row = _make_cert(db)
    fake_executor = MagicMock()
    fake_executor.run_shell.return_value = CommandResult(exit_code=0, stdout="", stderr="")
    monkeypatch.setattr(trusted_ca_jobs, "build_executor", lambda settings: fake_executor)

    result = trusted_ca_jobs.sync_job(db, {})

    assert result["executor_configured"] is True
    db.refresh(row)
    assert row.status == TrustedCaStatus.APPLIED
    assert row.last_error is None
    fake_executor.run_shell.assert_called_once()


def test_sync_job_marks_rows_failed_on_nonzero_exit(db, monkeypatch):
    row = _make_cert(db)
    fake_executor = MagicMock()
    fake_executor.run_shell.return_value = CommandResult(
        exit_code=1, stdout="", stderr="update-ca-trust: command not found"
    )
    monkeypatch.setattr(trusted_ca_jobs, "build_executor", lambda settings: fake_executor)

    trusted_ca_jobs.sync_job(db, {})

    db.refresh(row)
    assert row.status == TrustedCaStatus.FAILED
    assert "command not found" in row.last_error


def test_sync_job_marks_rows_failed_when_executor_cannot_reach_pulp(db, monkeypatch):
    row = _make_cert(db)
    fake_executor = MagicMock()
    fake_executor.run_shell.side_effect = ExecutorUnavailableError("no container found")
    monkeypatch.setattr(trusted_ca_jobs, "build_executor", lambda settings: fake_executor)

    trusted_ca_jobs.sync_job(db, {})

    db.refresh(row)
    assert row.status == TrustedCaStatus.FAILED
    assert "no container found" in row.last_error


def test_sync_job_reapplies_a_previously_failed_row_that_now_succeeds(db, monkeypatch):
    row = _make_cert(db, status=TrustedCaStatus.FAILED)
    fake_executor = MagicMock()
    fake_executor.run_shell.return_value = CommandResult(exit_code=0, stdout="", stderr="")
    monkeypatch.setattr(trusted_ca_jobs, "build_executor", lambda settings: fake_executor)

    trusted_ca_jobs.sync_job(db, {})

    db.refresh(row)
    assert row.status == TrustedCaStatus.APPLIED
