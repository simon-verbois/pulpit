import { Content } from "@patternfly/react-core";

export function AccessUsersTopic() {
  return (
    <Content>
      <Content component="p">
        Choose <strong>Create user</strong> and enter a username. Set a password if the
        user needs password login.
      </Content>
      <Content component="ul">
        <Content component="li">
          <strong>Edit</strong> updates the account. Leave the password blank to keep it.
          Disable <strong>Active</strong> to block login.
        </Content>
        <Content component="li">
          <strong>Roles → Assign role…</strong> grants permissions. A blank object scope
          grants the role globally.
        </Content>
        <Content component="li">
          For access to one repository, use that repository's <strong>Access</strong> tab
          instead.
        </Content>
      </Content>
    </Content>
  );
}
