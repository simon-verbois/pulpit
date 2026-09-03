import { Content } from "@patternfly/react-core";

export function AdministrationSystemStatusTopic() {
  return (
    <Content>
      <Content component="p">
        This page is a live read of Pulp's own <code>/pulp/api/v3/status/</code> endpoint
        — nothing here is stored by PulpIT, and only fields Pulp's response actually
        included are shown (no field is ever guessed or faked). It's the same data the
        Overview (home) page's status section shows, without the per-plugin repository
        counts.
      </Content>

      <Content component="h3">The tiles</Content>
      <Content component="p">
        Each tile only appears if Pulp's response included that field, so a deployment
        reporting fewer things than usual simply shows fewer tiles rather than a wrong
        value:
      </Content>
      <Content component="ul">
        <Content component="li">
          <strong>Database</strong> / <strong>Redis</strong> — a green{" "}
          <strong>Connected</strong> or red <strong>Disconnected</strong> label. Redis
          being disconnected is normal on a deployment that hasn't enabled Pulp's HTTP
          response cache — it isn't required for syncing, tasks, or authentication to
          work.
        </Content>
        <Content component="li">
          <strong>Online workers</strong> / <strong>Online API apps</strong> /{" "}
          <strong>Online content apps</strong> — how many of each process Pulp currently
          sees as alive. Zero online workers means sync/publish/delete tasks will never
          actually run even though they'll still show as "waiting" in the Tasks drawer.
        </Content>
        <Content component="li">
          <strong>Storage</strong> — used/total bytes if Pulp reported both, otherwise
          just free space if that's all that's available.
        </Content>
      </Content>

      <Content component="h3">Component versions and compatibility</Content>
      <Content component="p">
        The table lists every plugin Pulp reports (pulpcore itself, plus whichever of
        pulp_rpm/ pulp_container/pulp_ansible/others are installed) with its exact
        version. The <strong>Compatibility</strong> column compares that version against
        the version PulpIT's own features were last verified against —{" "}
        <strong>Matches verified</strong> (green), <strong>Newer</strong> (blue) or{" "}
        <strong>Older</strong> (orange) than verified, or <strong>Not implemented</strong>{" "}
        (grey) for a plugin PulpIT has no UI for at all. This is a hint, not an
        enforcement — PulpIT doesn't block or hide features based on it.
      </Content>
      <Content component="p">
        If a plugin you expect to see is missing from this table entirely, it isn't
        installed on this Pulp deployment — that's also why its entire section of the
        left-hand navigation (RPM/Containers/Ansible) would be hidden.
      </Content>
    </Content>
  );
}
