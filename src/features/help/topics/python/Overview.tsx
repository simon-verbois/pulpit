import { Content } from "@patternfly/react-core";

export function PythonOverviewTopic() {
  return (
    <Content>
      <Content component="p">
        Mirror or upload Python wheels and source packages. Sync into a repository,
        publish, then create a distribution for clients.
      </Content>
      <Content component="p">
        Autopublish is off by default; enable it if you want to publish after content
        changes.
      </Content>
    </Content>
  );
}
