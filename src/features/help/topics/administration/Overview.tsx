import { Content } from "@patternfly/react-core";

export function AdministrationOverviewTopic() {
  return (
    <Content>
      <Content component="p">
        This section covers Pulp-wide operational concerns that don't belong to one
        content type: the repository/package signing key PulpIT manages on your behalf,
        the raw signing services Pulp already has configured, extra access checks (content
        guards) a distribution can require before serving anything, and instance-wide
        defaults PulpIT itself applies (currently just a proxy).
      </Content>
      <Content component="p">
        See <strong>Repository Signing</strong>, <strong>Pulp Signing Services</strong>,{" "}
        <strong>Content guards</strong>, and <strong>Default Settings</strong> in the list
        on the left for how each one actually works. Pulp's own health/version status is
        already covered by the <strong>Overview</strong> page, so it isn't repeated as its
        own page here.
      </Content>
    </Content>
  );
}
