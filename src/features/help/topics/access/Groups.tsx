import { Content } from "@patternfly/react-core";

export function AccessGroupsTopic() {
  return (
    <Content>
      <Content component="p">
        Create a group to give several users the same access.
      </Content>
      <Content component="ol">
        <Content component="li">
          Choose <strong>Create group</strong> and enter a name.
        </Content>
        <Content component="li">
          Open <strong>Members</strong> to add or remove users.
        </Content>
        <Content component="li">
          Use <strong>Roles</strong> to assign shared permissions.
        </Content>
      </Content>
      <Content component="p">
        Removing a member or deleting the group does not delete user accounts.
      </Content>
    </Content>
  );
}
