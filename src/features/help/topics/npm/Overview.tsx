import { Content } from "@patternfly/react-core";

export function NpmOverviewTopic() {
  return (
    <Content>
      <Content component="p">
        Mirror or upload NPM packages. Create a remote and a repository, sync, then create
        a distribution.
      </Content>
      <Content component="p">
        No publish step is needed. A distribution can also cache packages directly from a
        remote.
      </Content>
    </Content>
  );
}
