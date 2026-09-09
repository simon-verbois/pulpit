from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database.base import Base
from app.core.jobs.models import Job, JobStatus
from app.core.jobs.registry import job_registry
from app.core.jobs.service import enqueue_job
from worker import main as worker


def test_long_handler_leaves_queue_writable_and_running_visible(tmp_path, monkeypatch):
    from contextlib import contextmanager
    engine = create_engine(f"sqlite:///{tmp_path}/jobs.db", connect_args={"timeout": 0.1})
    Base.metadata.create_all(engine)
    sessions = sessionmaker(engine, autoflush=False)
    @contextmanager
    def scope():
        with sessions.begin() as session:
            yield session
    monkeypatch.setattr(worker, "session_scope", scope)
    with scope() as db:
        job_id = enqueue_job(db, "test.concurrent", {}).id
    def handler(db, payload):
        with scope() as api:
            assert api.get(Job, job_id).status == JobStatus.RUNNING
            enqueue_job(api, "test.other", {})
        return {"ok": True}
    monkeypatch.setattr(job_registry, "known_types", lambda: ["test.concurrent"])
    monkeypatch.setattr(job_registry, "get", lambda name: handler)
    assert worker._run_one_job()
    with scope() as db:
        assert db.get(Job, job_id).status == JobStatus.SUCCESS
        assert db.query(Job).count() == 2


def test_interrupted_job_is_not_replayed(db, monkeypatch):
    from contextlib import contextmanager
    @contextmanager
    def scope():
        yield db
        db.commit()
    monkeypatch.setattr(worker, "session_scope", scope)
    job = enqueue_job(db, "signing.generate_key", {})
    job.status = JobStatus.RUNNING
    db.commit()
    worker._recover_interrupted_jobs()
    assert job.status == JobStatus.FAILED
    assert "inspect" in job.error


def test_worker_lock_excludes_a_second_worker(tmp_path, monkeypatch):
    from worker import lock
    engine = create_engine(f"sqlite:///{tmp_path}/locked.db")
    monkeypatch.setattr(lock, "_engine", engine)
    import pytest
    with lock.worker_lock():
        with pytest.raises(RuntimeError, match="already running"):
            with lock.worker_lock():
                raise AssertionError("Second worker acquired the same database")
    with lock.worker_lock():
        pass
