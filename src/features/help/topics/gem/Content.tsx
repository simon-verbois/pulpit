import { Content } from "@patternfly/react-core";

export function GemContentTopic() {
  return (
    <Content>
      <Content component="p">
        A read-only view of every gem Pulp knows about, across <strong>every</strong>{" "}
        repository - not scoped to one. Each row shows the gem's name, version, and
        platform, parsed from its own embedded metadata. Search by name to narrow the
        list; there's no per-repository filter here (use a repository's own{" "}
        <strong>Content</strong> tab for that).
      </Content>
      <Content component="p">
        Gems appear here once a repository has synced content that includes them, or a
        gem has been uploaded directly to a repository. There's no upload action on this
        global page - it's for browsing/finding a gem, not adding one.
      </Content>
    </Content>
  );
}
