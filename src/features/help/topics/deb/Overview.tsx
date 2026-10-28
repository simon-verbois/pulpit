import { Content } from "@patternfly/react-core";

export function DebOverviewTopic() {
  return (
    <Content>
      <Content component="p">
        Mirror or upload Debian packages. Sync content into a repository, publish it, then
        create a distribution for clients.
      </Content>
      <Content component="p">
        Autopublish is off by default; enable it if you want to publish after content
        changes.
      </Content>
    </Content>
  );
}
