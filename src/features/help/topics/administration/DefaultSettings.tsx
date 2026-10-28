import { Content } from "@patternfly/react-core";

export function AdministrationDefaultSettingsTopic() {
  return (
    <Content>
      <Content component="p">
        Set the outgoing proxy used by remotes, including Oracle ULN.
      </Content>
      <Content component="ol">
        <Content component="li">Enter the proxy URL and credentials if required.</Content>
        <Content component="li">
          If your proxy checks HTTPS traffic, add the CA certificate provided by your
          administrator.
        </Content>
        <Content component="li">
          Keep certificate validation enabled, save, then test a remote connection.
        </Content>
      </Content>
      <Content component="p">
        Leave the password blank to keep it. Clear the proxy URL to connect directly.
        Changes apply to new connections.
      </Content>
    </Content>
  );
}
