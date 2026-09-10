"""`repository_sync_state` (app/modules/signing/repository_sync_state.py) -
the per-repository "highest version already resigned" watermark used by
both `detect_repository_content_changes_job` and
`apply_signing_to_all_repositories_job` to check content conformance
independently of Pulp signing-field configuration."""

from app.modules.signing import repository_sync_state

REPO_HREF = "/pulp/api/v3/repositories/rpm/rpm/abc/"


def test_needs_resign_is_false_for_a_never_synced_repository(db):
    assert repository_sync_state.needs_resign(db, REPO_HREF, f"{REPO_HREF}versions/0/") is False


def test_needs_resign_is_false_for_no_latest_version_at_all(db):
    assert repository_sync_state.needs_resign(db, REPO_HREF, None) is False


def test_needs_resign_is_true_with_no_prior_state(db):
    assert repository_sync_state.needs_resign(db, REPO_HREF, f"{REPO_HREF}versions/1/") is True


def test_advance_then_needs_resign_reflects_the_new_watermark(db):
    repository_sync_state.advance(db, REPO_HREF, 5)

    assert repository_sync_state.needs_resign(db, REPO_HREF, f"{REPO_HREF}versions/5/") is False
    assert repository_sync_state.needs_resign(db, REPO_HREF, f"{REPO_HREF}versions/6/") is True


def test_advance_never_moves_the_watermark_backwards(db):
    repository_sync_state.advance(db, REPO_HREF, 5)
    repository_sync_state.advance(db, REPO_HREF, 3)

    assert repository_sync_state.last_processed_version(db, REPO_HREF) == 5
