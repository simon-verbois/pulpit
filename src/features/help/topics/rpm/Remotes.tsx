import { Content } from "@patternfly/react-core";

export function RpmRemotesTopic() {
  return (
    <Content>
      <Content component="p">A remote tells Pulp where to download RPM content.</Content>
      <Content component="ul">
        <Content component="li">
          <strong>Standard</strong>: enter a name and the yum/dnf repository URL.
        </Content>
        <Content component="li">
          <strong>ULN</strong>: enter the Oracle channel, server URL and account
          credentials.
        </Content>
        <Content component="li">
          <strong>Immediate</strong> downloads now. <strong>On demand</strong> downloads
          when requested. <strong>Streamed</strong> does not keep downloaded files.
        </Content>
      </Content>
      <Content component="p">
        Leave saved credentials blank when editing to keep them. Proxy and trusted
        certificates are set in <strong>Administration → Global Proxy Settings</strong>.
      </Content>
    </Content>
  );
}
