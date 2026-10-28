import { Content } from "@patternfly/react-core";

export function AdministrationOverviewTopic() {
  return (
    <Content>
      <Content component="h3">Task history retention</Content>
      <Content component="p">
        In <strong>General → Task history</strong>, staff can choose how many days to keep
        finished Pulp tasks and enable or disable daily deletion. Save the retention
        settings before choosing <strong>Purge now</strong>. Confirming this action
        permanently deletes completed, failed, canceled and skipped tasks older than the
        saved period, even when automatic deletion is disabled. Running tasks are kept.
        The default is automatic deletion after 90 days.
      </Content>
      <Content component="p">
        Follow the purge in the Tasks drawer, even after closing the confirmation window.
        It is complete only when Pulp finishes deleting the tasks. This page shows the
        last attempt and any failure; fix the reported problem before retrying.
      </Content>
      <Content component="p">
        This section covers instance-wide and Pulp-wide concerns that don't belong to one
        content type: which nav sections every user sees, the accounts/groups/roles Pulp
        itself authenticates, the repository/package signing key PulpIT manages on your
        behalf, the raw signing services Pulp already has configured, extra access checks
        (content guards) a distribution can require before serving anything, the
        certificate used by Pulpit's HTTPS listener, and a global outbound proxy PulpIT
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
