import { Content } from "@patternfly/react-core";

export function RpmPackagesTopic() {
  return (
    <Content>
      <Content component="p">
        A read-only view of every RPM package content unit Pulp knows about, across{" "}
        <strong>every</strong> repository - not scoped to one. Each row shows the
        package's name, version-release, architecture, and size. Search by name to narrow
        the list; there's no per-repository filter here (use a repository's own{" "}
        <strong>Packages</strong> tab for that).
      </Content>
      <Content component="p">
        Packages appear here once a repository has synced content that includes them, or a
        package has been uploaded directly to a repository (via that repository's{" "}
        <strong>Packages</strong> tab, or its <strong>Upload package</strong> action).
        There's no upload action on this global page - it's for browsing/finding a
        package, not adding one.
      </Content>
    </Content>
  );
}
