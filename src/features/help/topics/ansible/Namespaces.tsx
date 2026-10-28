import { Content } from "@patternfly/react-core";

export function AnsibleNamespacesTopic() {
  return (
    <Content>
      <Content component="p">
        Select a distribution, then choose <strong>Create namespace</strong> to add its
        Galaxy profile. Use a lowercase name with underscores; company, contact details
        and avatar are optional.
      </Content>
      <Content component="p">
        A namespace cannot be deleted while it still has associated collections.
      </Content>
    </Content>
  );
}
