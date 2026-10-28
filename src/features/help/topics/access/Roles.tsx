import { Content } from "@patternfly/react-core";

export function AccessRolesTopic() {
  return (
    <Content>
      <Content component="p">
        A role is a set of permissions. Built-in roles are read-only.
      </Content>
      <Content component="p">
        For a custom role, choose <strong>Create role</strong>, enter a name and select
        permissions. Assign it to users or groups to grant access. Use{" "}
        <strong>Edit</strong> or <strong>Delete</strong> to manage custom roles.
      </Content>
    </Content>
  );
}
