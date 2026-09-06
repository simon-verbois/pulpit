import { Content } from "@patternfly/react-core";

export function FileOverviewTopic() {
  return (
    <Content>
      <Content component="p">
        Use this area to manage arbitrary file content: repositories, the files inside
        them, and the remotes you sync from.
      </Content>
      <Content component="p">
        The usual shape of things: create a <strong>remote</strong> pointing at an
        external file source, create a <strong>repository</strong> that uses it as its
        default, then <strong>sync</strong>. From there, a <strong>distribution</strong>{" "}
        is what actually makes the repository's content downloadable over HTTP.
      </Content>
      <Content component="p">
        Use the pages on the left for the details of each part -{" "}
        <strong>Repositories</strong> for the full repository lifecycle (sync, publish,
        distributions, versions), <strong>Content</strong> to browse files across every
        repository at once, and <strong>Remotes</strong> for sync sources.
      </Content>
    </Content>
  );
}
