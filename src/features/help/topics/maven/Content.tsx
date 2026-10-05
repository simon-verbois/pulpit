import { Content } from "@patternfly/react-core";

export function MavenContentTopic() {
  return (
    <Content>
      <Content component="p">
        A read-only view of every Maven artifact Pulp knows about, across{" "}
        <strong>every</strong> repository - not scoped to one. Each row shows the
        artifact's group ID, artifact ID, version, filename, and the repositories whose
        current version contains it. Repository names open their detail pages. Search by
        group ID to narrow the list; there's no per-repository filter here (use a
        repository's own <strong>Content</strong> tab for that).
      </Content>
      <Content component="p">
        Artifacts appear here once they've been uploaded to a repository. There's no
        upload action on this global page - it's for browsing/finding an artifact, not
        adding one.
      </Content>
    </Content>
  );
}
