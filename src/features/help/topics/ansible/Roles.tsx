import { Content } from "@patternfly/react-core";

export function AnsibleRolesTopic() {
  return (
    <Content>
      <Content component="p">Find classic Ansible roles across all repositories.</Content>
      <Content component="p">
        To add one, open a repository's <strong>Roles → Upload role</strong> action, or
        sync from a Role or Git remote.
      </Content>
    </Content>
  );
}
