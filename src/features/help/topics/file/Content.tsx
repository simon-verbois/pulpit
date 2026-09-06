import { Content } from "@patternfly/react-core";

export function FileContentTopic() {
  return (
    <Content>
      <Content component="p">
        A read-only view of every file content unit Pulp knows about, across{" "}
        <strong>every</strong> repository - not scoped to one. Each row shows the file's
        relative path and SHA256 checksum. Search by relative path to narrow the list;
        there's no per-repository filter here (use a repository's own{" "}
        <strong>Content</strong> tab for that).
      </Content>
      <Content component="p">
        Files appear here once a repository has synced content that includes them, or a
        file has been uploaded directly to a repository (via that repository's{" "}
        <strong>Content</strong> tab and its <strong>Upload file</strong> action). There's
        no upload action on this global page - it's for browsing/finding a file, not
        adding one.
      </Content>
    </Content>
  );
}
