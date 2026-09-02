import { Content } from "@patternfly/react-core";

export function AccessOverviewTopic() {
  return (
    <Content>
      <Content component="p">
        Use this area to manage who can do what in Pulp: user accounts, groups of users,
        and the reusable permission sets ("roles") granted to them. Nothing here is a
        PulpIT-specific concept — every user, group, and role is a real Pulp object, the
        same ones Pulp's own API and any other client see.
      </Content>
      <Content component="p">
        <strong>Users</strong> are individual accounts that can log in.{" "}
        <strong>Groups</strong> collect users so they can be granted roles together
        instead of one by one. A <strong>role</strong> is a named bundle of permissions —
        on its own it does nothing until it's assigned to a user or group, either globally
        or scoped to one specific object (a repository, remote, distribution, etc.).
      </Content>
      <Content component="p">
        Pick <strong>Users</strong>, <strong>Groups</strong>, or <strong>Roles</strong> on
        the left for exactly how each page works.
      </Content>
    </Content>
  );
}
