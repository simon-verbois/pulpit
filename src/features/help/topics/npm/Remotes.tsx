import { Content } from "@patternfly/react-core";

export function NpmRemotesTopic() {
  return (
    <Content>
      <Content component="p">
        Choose <strong>Create remote</strong> and enter a name and registry URL, such as{" "}
        <code>https://registry.npmjs.org</code>.
      </Content>
      <Content component="p">
        Select <strong>On demand</strong> to download packages only when requested. A
        distribution can use this remote as a cache.
      </Content>
    </Content>
  );
}
