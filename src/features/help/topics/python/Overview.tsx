import { Content } from "@patternfly/react-core";

export function PythonOverviewTopic() {
  return (
    <Content>
      <Content component="p">
        Mirror or upload Python wheels and source packages. Sync into a repository,
        publish, then create a distribution for clients.
      </Content>
      <Content component="p">
        Autopublish is on by default. Disable it when you want to publish content changes
        manually.
      </Content>
    </Content>
  );
}
