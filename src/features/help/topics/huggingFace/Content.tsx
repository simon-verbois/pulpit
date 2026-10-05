import { Content } from "@patternfly/react-core";

export function HuggingFaceContentTopic() {
  return (
    <Content>
      <Content component="p">
        A read-only view of every Hugging Face file Pulp knows about, across{" "}
        <strong>every</strong> repository - not scoped to one. Each row shows the file's
        relative path, the Hub repo it belongs to, its type (model/dataset/space), and the
        repositories whose current version contains it. Repository names open their detail
        pages. Search by relative path to narrow the list; there's no per-repository
        filter here (use a repository's own <strong>Content</strong> tab for that).
      </Content>
      <Content component="p">
        Files appear here once a repository has synced content that includes them, or a
        file has been uploaded directly to a repository. There's no upload action on this
        global page - it's for browsing/finding a file, not adding one.
      </Content>
    </Content>
  );
}
