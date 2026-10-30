import { Content } from "@patternfly/react-core";
import { RemoteConnectionHelp } from "../RemoteConnectionHelp";

export function AnsibleRemotesTopic() {
  return (
    <Content>
      <Content component="p">Choose the source that matches your content:</Content>
      <Content component="ul">
        <Content component="li">
          <strong>Collection</strong>: Galaxy or Automation Hub. Use a requirements file
          to select collections and a token for a private Hub.
        </Content>
        <Content component="li">
          <strong>Git</strong>: a Git URL and optional branch, tag or commit.
        </Content>
        <Content component="li">
          <strong>Role</strong>: a source of classic Galaxy roles.
        </Content>
      </Content>
      <Content component="p">
        Immediate downloads content now; On demand downloads when requested; Streamed does
        not keep files. Git remotes do not use this setting.
      </Content>
      <RemoteConnectionHelp />
    </Content>
  );
}
