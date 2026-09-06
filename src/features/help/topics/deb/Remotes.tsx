import { Content } from "@patternfly/react-core";

export function DebRemotesTopic() {
  return (
    <Content>
      <Content component="p">
        A remote points at a Debian archive mirror (such as{" "}
        <code>deb.debian.org</code>) that a repository can sync from.{" "}
        <strong>Create remote</strong> needs a <strong>Name</strong>, a{" "}
        <strong>URL</strong>, and (unlike every other plugin's remote in this app){" "}
        <strong>Distributions</strong> - a whitespace-separated list of release
        codenames or suites to sync (e.g. <code>bookworm</code>). Without knowing which
        distribution(s) to fetch, pulp_deb has nothing to sync at all.
      </Content>
      <Content component="p">
        <strong>Sync policy</strong> controls how much content is downloaded up front
        (Immediate/On demand/Streamed).
      </Content>
      <Content component="p">
        Expand <strong>Advanced connection settings</strong> for a proxy or origin
        server credentials. <strong>Edit</strong> changes any of these fields;{" "}
        <strong>Delete</strong> removes the remote (repositories that used it as their
        default keep working, just without one).
      </Content>
    </Content>
  );
}
