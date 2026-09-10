"""`has_matching_pending_job` (app/core/jobs/service.py) - the
payload-aware dedup check used to keep two equivalent
`signing.resign_repository_packages` jobs for the same
(repository_href, fingerprint) from ever being queued/running at once
(task requirement)."""

from app.core.jobs.service import enqueue_job, has_matching_pending_job, mark_succeeded

JOB_TYPE = "signing.resign_repository_packages"
REPO_A = "/pulp/api/v3/repositories/rpm/rpm/a/"
REPO_B = "/pulp/api/v3/repositories/rpm/rpm/b/"
FINGERPRINT = "A" * 40


def test_no_match_when_nothing_queued(db):
    assert not has_matching_pending_job(
        db, JOB_TYPE, payload_subset={"repository_href": REPO_A, "fingerprint": FINGERPRINT}
    )


def test_matches_a_queued_job_with_the_same_payload_subset(db):
    enqueue_job(db, JOB_TYPE, {"repository_href": REPO_A, "fingerprint": FINGERPRINT, "since_version": "x"})

    assert has_matching_pending_job(
        db, JOB_TYPE, payload_subset={"repository_href": REPO_A, "fingerprint": FINGERPRINT}
    )


def test_does_not_match_a_different_repository_or_fingerprint(db):
    enqueue_job(db, JOB_TYPE, {"repository_href": REPO_A, "fingerprint": FINGERPRINT})

    assert not has_matching_pending_job(
        db, JOB_TYPE, payload_subset={"repository_href": REPO_B, "fingerprint": FINGERPRINT}
    )
    assert not has_matching_pending_job(
        db, JOB_TYPE, payload_subset={"repository_href": REPO_A, "fingerprint": "B" * 40}
    )


def test_does_not_match_a_finished_job(db):
    job = enqueue_job(db, JOB_TYPE, {"repository_href": REPO_A, "fingerprint": FINGERPRINT})
    mark_succeeded(db, job, {})

    assert not has_matching_pending_job(
        db, JOB_TYPE, payload_subset={"repository_href": REPO_A, "fingerprint": FINGERPRINT}
    )
