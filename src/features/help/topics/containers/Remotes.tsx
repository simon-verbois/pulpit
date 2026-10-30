import { Content } from "@patternfly/react-core";
import { RemoteConnectionHelp } from "../RemoteConnectionHelp";

export function ContainersRemotesTopic() {
  return (
    <Content>
      <Content component="p">
        Enter the <strong>Registry URL</strong> and <strong>Upstream image name</strong>,
        for example <code>https://registry.hub.docker.com</code> and{" "}
        <code>library/busybox</code>.
      </Content>
      <Content component="p">
        Use <strong>Include tags</strong> to limit downloads, for example{" "}
        <code>latest, v1.*</code>. Add credentials for a private registry.
      </Content>
      <Content component="p">
        Immediate downloads now; On demand downloads when requested; Streamed does not
        keep files.
      </Content>
      <RemoteConnectionHelp />
    </Content>
  );
}
