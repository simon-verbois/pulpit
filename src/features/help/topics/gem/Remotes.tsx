import { Content } from "@patternfly/react-core";

export function GemRemotesTopic() {
  return (
    <Content>
      <Content component="p">
        A remote points at a RubyGems source (such as <code>rubygems.org</code>) that a
        repository can sync from. <strong>Create remote</strong> needs a{" "}
        <strong>Name</strong> and a <strong>URL</strong>. <strong>Sync policy</strong>{" "}
        controls how much content is downloaded up front (Immediate/On demand/Streamed).
      </Content>
      <Content component="p">
        Expand <strong>Advanced connection settings</strong> for a proxy or origin server
        credentials. <strong>Edit</strong> changes any of these fields;{" "}
        <strong>Delete</strong> removes the remote (repositories that used it as their
        default keep working, just without one).
      </Content>
    </Content>
  );
}
