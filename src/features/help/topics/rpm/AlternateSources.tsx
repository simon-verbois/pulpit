import { Content } from "@patternfly/react-core";

export function RpmAlternateSourcesTopic() {
  return (
    <Content>
      <Content component="p">Use a local mirror to reduce external downloads.</Content>
      <Content component="ol">
        <Content component="li">
          Create a remote with the <strong>On demand</strong> policy.
        </Content>
        <Content component="li">
          Choose <strong>Create alternate source</strong>, select that remote and
          optionally limit its paths.
        </Content>
        <Content component="li">
          Choose <strong>Refresh</strong> after the mirror changes.
        </Content>
      </Content>
    </Content>
  );
}
