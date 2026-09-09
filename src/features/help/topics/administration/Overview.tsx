import { Content } from "@patternfly/react-core";

export function AdministrationOverviewTopic() {
  return (
    <Content>
      <Content component="p">
        This section covers instance-wide and Pulp-wide concerns that don't belong to one
        content type: which nav sections every user sees, the accounts/groups/roles Pulp
        itself authenticates, the repository/package signing key PulpIT manages on your
        behalf, the raw signing services Pulp already has configured, extra access checks
        (content guards) a distribution can require before serving anything, the
        certificate used by Pulpit's HTTPS listener, and a global default proxy PulpIT
        itself applies to Remotes.
      </Content>
      <Content component="p">
        See <strong>Users</strong>, <strong>Groups</strong>, <strong>Roles</strong>,{" "}
        <strong>Repository Signing</strong>, <strong>Pulp Signing Services</strong>,{" "}
        <strong>Content guards</strong>, <strong>TLS</strong>, and{" "}
        <strong>Global Proxy Settings</strong> in the list on the left for how each one
        actually works. Pulp's own health/version status is already covered by the{" "}
        <strong>Overview</strong> page, so it isn't repeated as its own page here.
      </Content>
    </Content>
  );
}
