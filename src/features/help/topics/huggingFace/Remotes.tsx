import { Content } from "@patternfly/react-core";

export function HuggingFaceRemotesTopic() {
  return (
    <Content>
      <Content component="p">
        Choose <strong>Create remote</strong> and enter a name and a Hub repository URL.
        Add a <strong>Hub token</strong> for private or gated content.
      </Content>
      <Content component="p">
        Set <strong>Hub URL</strong> only for a custom Hub. Leave a saved token blank when
        editing to keep it.
      </Content>
    </Content>
  );
}
