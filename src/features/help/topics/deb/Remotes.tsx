import { Content } from "@patternfly/react-core";

export function DebRemotesTopic() {
  return (
    <Content>
      <Content component="p">
        Choose <strong>Create remote</strong> and enter a name, archive URL and{" "}
        <strong>Distributions</strong>, such as <code>bookworm</code>.
      </Content>
      <Content component="p">
        Immediate downloads now; On demand downloads when requested; Streamed does not
        keep files. Add source credentials if needed. The outgoing proxy is set under{" "}
        <strong>Administration → Global Proxy Settings</strong>.
      </Content>
    </Content>
  );
}
