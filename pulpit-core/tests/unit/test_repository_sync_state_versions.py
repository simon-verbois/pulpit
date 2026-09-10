from app.modules.signing import repository_sync_state

REPO_HREF = "/pulp/api/v3/repositories/rpm/rpm/abc/"


def test_version_number_parses_the_trailing_integer():
    assert repository_sync_state.version_number(f"{REPO_HREF}versions/52/") == 52
    assert repository_sync_state.version_number(f"{REPO_HREF}versions/0/") == 0


def test_version_href_builds_the_matching_pulp_href():
    assert repository_sync_state.version_href(REPO_HREF, 52) == f"{REPO_HREF}versions/52/"
    # Trailing slash on the repository href itself must not double up.
    assert repository_sync_state.version_href(REPO_HREF.rstrip("/"), 52) == f"{REPO_HREF}versions/52/"
