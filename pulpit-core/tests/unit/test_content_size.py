from app.modules.content_size.jobs import _component_from_content_href


class TestComponentFromContentHref:
    def test_extracts_component_segment(self):
        assert (
            _component_from_content_href("/pulp/api/v3/content/rpm/packages/abc-123/") == "rpm"
        )

    def test_works_for_any_plugin(self):
        assert (
            _component_from_content_href("/pulp/api/v3/content/ansible/roles/abc/") == "ansible"
        )

    def test_no_content_segment_returns_none(self):
        assert _component_from_content_href("/pulp/api/v3/artifacts/abc-123/") is None

    def test_content_segment_with_nothing_after_returns_none(self):
        assert _component_from_content_href("/pulp/api/v3/content/") is None
