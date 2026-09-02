import { Content } from "@patternfly/react-core";

export function RpmAlternateSourcesTopic() {
  return (
    <Content>
      <Content component="p">
        An Alternate Content Source (ACS) makes Pulp check a local mirror before reaching
        out to a remote's real upstream - useful when several remotes point at the same
        content, to cut down on repeated external downloads.
      </Content>
      <Content component="h3">Creating one</Content>
      <Content component="p">
        <strong>Create alternate source</strong> needs a <strong>Name</strong> and a{" "}
        <strong>Remote</strong> - only remotes using the <strong>On demand</strong> sync
        policy are offered, since Pulp rejects any other policy here. Create an on-demand
        remote first (on the <strong>Remotes</strong> page) if none are listed.{" "}
        <strong>Paths</strong> is optional, comma-separated (e.g.{" "}
        <code>rhel8/baseos, rhel8/appstream</code>) - scope which parts of the mirror this
        source covers, or leave it blank to cover everything.
      </Content>
      <Content component="h3">Keeping it up to date</Content>
      <Content component="p">
        After the mirror's own content changes, click <strong>Refresh</strong> so Pulp
        re-scans what's actually available - this runs in the background, like a sync. The
        list shows <strong>Last refreshed</strong> ("Never" until the first one
        completes). <strong>Delete</strong> removes the alternate source; the
        remotes/repositories that benefited from it keep working, just without the local
        mirror shortcut.
      </Content>
    </Content>
  );
}
