import { Content } from "@patternfly/react-core";

export function GemOverviewTopic() {
  return (
    <Content>
      <Content component="p">
        Use this area to manage RubyGems content: <code>.gem</code> packages mirrored from
        a source such as rubygems.org, or uploaded directly.
      </Content>
      <Content component="p">
        The usual shape of things: create a <strong>remote</strong> pointing at a RubyGems
        source, create a <strong>repository</strong> that uses it as its default, then{" "}
        <strong>sync</strong>. Like Hugging Face, this plugin has no autopublish - a{" "}
        <strong>distribution</strong> only serves what you explicitly{" "}
        <strong>publish</strong>.
      </Content>
      <Content component="p">
        Use the pages on the left for the details of each part -{" "}
        <strong>Repositories</strong> for the full repository lifecycle,{" "}
        <strong>Content</strong> to browse gems across every repository at once, and{" "}
        <strong>Remotes</strong> for sync sources.
      </Content>
    </Content>
  );
}
