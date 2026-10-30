import { Content } from "@patternfly/react-core";

export function DebOverviewTopic() {
  return (
    <Content>
      <Content component="p">
        Mirror or upload Debian packages. Sync content into a repository, publish it, then
        create a distribution for clients.
      </Content>
      <Content component="p">
        Autopublish is on by default. Disable it when you want to publish content changes
        manually.
      </Content>
    </Content>
  );
}
