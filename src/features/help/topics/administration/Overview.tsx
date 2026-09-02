import { Content } from "@patternfly/react-core";

export function AdministrationOverviewTopic() {
  return (
    <Content>
      <Content component="p">
        This section covers Pulp-wide operational concerns that don't belong to one
        content type: whether Pulp itself is healthy, the repository/package signing key
        PulpIT manages on your behalf, the raw signing services Pulp already has
        configured, and extra access checks (content guards) a distribution can require
        before serving anything.
      </Content>
      <Content component="p">
        See <strong>System status</strong>, <strong>Repository Signing</strong>,{" "}
        <strong>Pulp Signing Services</strong>, and <strong>Content guards</strong> in the
        list on the left for how each one actually works.
      </Content>
    </Content>
  );
}
