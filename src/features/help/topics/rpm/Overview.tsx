import { Content } from "@patternfly/react-core";

export function RpmOverviewTopic() {
  return (
    <Content>
      <Content component="p">
        Use this area to manage RPM content: repositories, the packages and advisories
        inside them, and the remotes you sync from.
      </Content>
      <Content component="p">
        The usual shape of things: create a <strong>remote</strong> pointing at an
        external yum/dnf source, create a <strong>repository</strong> that uses it as its
        default, then <strong>sync</strong>. From there, a <strong>distribution</strong>{" "}
        is what actually makes the repository's content downloadable by <code>dnf</code>/
        <code>yum</code>.
      </Content>
      <Content component="p">
        Use the pages on the left for the details of each part -{" "}
        <strong>Repositories</strong> for the full repository lifecycle (sync, publish,
        distributions, versions, signing), <strong>Packages</strong>/
        <strong>Advisories</strong> to browse content across every repository at once,{" "}
        <strong>Remotes</strong> for sync sources, and <strong>Alternate sources</strong>{" "}
        for local mirroring.
      </Content>
    </Content>
  );
}
