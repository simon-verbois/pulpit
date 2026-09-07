import { Content } from "@patternfly/react-core";

export function NpmOverviewTopic() {
  return (
    <Content>
      <Content component="p">
        Use this area to manage NPM content: packages mirrored from a registry such as
        registry.npmjs.org, or uploaded directly.
      </Content>
      <Content component="p">
        The usual shape of things: create a <strong>remote</strong> pointing at an NPM
        registry, create a <strong>repository</strong> that uses it as its default, then{" "}
        <strong>sync</strong>. Unlike gem/hugging_face, this plugin has no publication
        step at all - a <strong>distribution</strong> serves a repository's latest version
        immediately.
      </Content>
      <Content component="p">
        A distribution can also proxy a remote directly for pull-through caching,
        independent of a repository's synced content (see a repository's{" "}
        <strong>Distributions</strong> tab).
      </Content>
    </Content>
  );
}
