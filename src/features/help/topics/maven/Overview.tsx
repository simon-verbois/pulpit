import { Content } from "@patternfly/react-core";

export function MavenOverviewTopic() {
  return (
    <Content>
      <Content component="p">
        Use this area to manage Maven artifacts. This plugin works differently from every
        other one in this app: pulp_maven is primarily a{" "}
        <strong>pull-through caching proxy</strong>, not a sync/publish pipeline.
      </Content>
      <Content component="p">
        A <strong>repository</strong> here has no default remote and no sync action -
        content only gets in through a direct <strong>upload</strong> (from a repository's
        own <strong>Content</strong> tab). A <strong>distribution</strong> then serves
        that repository's latest version immediately - there's no publish step either.
      </Content>
      <Content component="p">
        <strong>Remotes</strong> aren't used to sync a repository - instead, a
        distribution can optionally proxy a remote directly for caching (see a
        repository's <strong>Distributions</strong> tab).
      </Content>
    </Content>
  );
}
