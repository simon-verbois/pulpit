import { Content } from "@patternfly/react-core";

export function MavenRemotesTopic() {
  return (
    <Content>
      <Content component="p">
        Create a remote with a name and Maven source URL. Attach it to a distribution to
        cache downloads; Maven remotes do not run repository syncs.
      </Content>
      <Content component="p">
        <strong>On demand</strong> downloads artifacts when clients request them.
      </Content>
    </Content>
  );
}
