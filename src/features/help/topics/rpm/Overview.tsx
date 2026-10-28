import { Content } from "@patternfly/react-core";

export function RpmOverviewTopic() {
  return (
    <Content>
      <Content component="p">
        Manage RPM packages and advisories for yum/dnf clients.
      </Content>
      <Content component="p">
        Create a remote, connect it to a repository, sync, then publish. Add a
        distribution to get the client download address.
      </Content>
    </Content>
  );
}
