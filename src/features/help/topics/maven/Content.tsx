import { Content } from "@patternfly/react-core";

export function MavenContentTopic() {
  return (
    <Content>
      <Content component="p">
        Search Maven artifacts by group ID across all repositories. Click a repository
        name to open it.
      </Content>
      <Content component="p">
        Upload artifacts from a repository's <strong>Content</strong> tab.
      </Content>
    </Content>
  );
}
