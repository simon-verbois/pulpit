import { Content } from "@patternfly/react-core";

export function AccessGroupsTopic() {
  return (
    <Content>
      <Content component="p">
        A group is a set of users that can be granted roles together instead of one by
        one. The <strong>Groups</strong> list shows every group — search by name, and
        click <strong>Create group</strong> (just a name) to add one.
      </Content>

      <Content component="h3">Members</Content>
      <Content component="p">
        Open a group and use its <strong>Members</strong> tab.{" "}
        <strong>Add member…</strong> picks from every user not already in the group;{" "}
        <strong>Remove</strong> takes a user back out. Removing someone from a group only
        affects what they inherit from that group's own role assignments — it never
        deletes the user account itself.
      </Content>

      <Content component="h3">Granting the group permissions</Content>
      <Content component="p">
        The <strong>Roles</strong> tab works exactly like a user's own Roles tab:{" "}
        <strong>Assign role…</strong> picks a role and, optionally, an object href to
        scope it to (leave it blank for a global assignment across every object of every
        type). Every current member of the group inherits whatever roles are assigned here
        — a role granted to the group does not show up on any individual member's own
        Roles tab, only here.
      </Content>

      <Content component="h3">Deleting a group</Content>
      <Content component="p">
        <strong>Delete group</strong>, on the group's own page, removes the group and its
        role assignments after a confirmation. Its members' accounts are unaffected.
      </Content>
    </Content>
  );
}
