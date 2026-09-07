import { Content } from "@patternfly/react-core";

export function MavenRemotesTopic() {
  return (
    <Content>
      <Content component="p">
        A remote points at a Maven source, such as Maven Central. Unlike every other
        plugin here, a Maven remote isn't used to sync a repository - pulp_maven's
        repositories have no sync action at all. Instead, a remote can be attached
        directly to a <strong>distribution</strong> to proxy it as a pull-through cache
        (see a repository's <strong>Distributions</strong> tab).
      </Content>
      <Content component="p">
        <strong>Create remote</strong> needs a <strong>Name</strong> and a{" "}
        <strong>URL</strong>. <strong>Sync policy</strong> controls how much content is
        downloaded up front (Immediate/On demand/Streamed) - for a pull-through cache,{" "}
        <strong>On demand</strong> is the usual choice.
      </Content>
      <Content component="p">
        Expand <strong>Advanced connection settings</strong> for a proxy or origin server
        credentials. <strong>Edit</strong> changes any of these fields;{" "}
        <strong>Delete</strong> removes the remote.
      </Content>
    </Content>
  );
}
