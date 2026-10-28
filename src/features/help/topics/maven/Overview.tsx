import { Content } from "@patternfly/react-core";

export function MavenOverviewTopic() {
  return (
    <Content>
      <Content component="p">
        Store Maven artifacts or cache downloads from another Maven source.
      </Content>
      <Content component="p">
        Upload artifacts into a repository, then create a distribution. For caching,
        attach a remote to the distribution. Maven has no sync or publish step.
      </Content>
    </Content>
  );
}
