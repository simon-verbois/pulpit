import { Content } from "@patternfly/react-core";

export function DebOverviewTopic() {
  return (
    <Content>
      <Content component="p">
        Use this area to manage Debian content: <code>.deb</code> packages mirrored from
        an archive such as deb.debian.org, or uploaded directly.
      </Content>
      <Content component="p">
        The usual shape of things: create a <strong>remote</strong> pointing at a Debian
        archive mirror, create a <strong>repository</strong> that uses it as its
        default, then <strong>sync</strong>. Same as RPM/File/Python, this plugin has{" "}
        <strong>autopublish</strong> - on by default, so a synced repository is
        immediately servable without a separate manual publish step.
      </Content>
      <Content component="p">
        Use the pages on the left for the details of each part -{" "}
        <strong>Repositories</strong> for the full repository lifecycle,{" "}
        <strong>Content</strong> to browse packages across every repository at once, and{" "}
        <strong>Remotes</strong> for sync sources.
      </Content>
    </Content>
  );
}
