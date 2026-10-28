import { Content } from "@patternfly/react-core";

export function AccessOverviewTopic() {
  return (
    <Content>
      <Content component="p">
        <strong>Users</strong> are individual accounts. <strong>Groups</strong> share
        access between users. <strong>Roles</strong> define what they can do.
      </Content>
      <Content component="p">
        For access to one repository, open its <strong>Access</strong> tab and grant a
        role to the users or groups you select.
      </Content>
    </Content>
  );
}
