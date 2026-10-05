import { Content } from "@patternfly/react-core";

export function DebContentTopic() {
  return (
    <Content>
      <Content component="p">
        A read-only view of every Debian package Pulp knows about, across{" "}
        <strong>every</strong> repository - not scoped to one. Each row shows the
        package's name, version, architecture, and the repositories whose current version
        contains it. Repository names open their detail pages. Search by package name to
        narrow the list; there's no per-repository filter here (use a repository's own{" "}
        <strong>Content</strong> tab for that).
      </Content>
      <Content component="p">
        Packages appear here once a repository has synced content that includes them, or a
        package has been uploaded directly to a repository. There's no upload action on
        this global page - it's for browsing/finding a package, not adding one.
      </Content>
    </Content>
  );
}
