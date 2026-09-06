import { Content } from "@patternfly/react-core";

export function NpmRemotesTopic() {
  return (
    <Content>
      <Content component="p">
        A remote points at an NPM registry (such as <code>registry.npmjs.org</code>)
        that a repository can sync from. <strong>Create remote</strong> needs a{" "}
        <strong>Name</strong> and a <strong>URL</strong>. <strong>Sync policy</strong>{" "}
        controls how much content is downloaded up front (Immediate/On demand/Streamed).
      </Content>
      <Content component="p">
        A remote can also be attached directly to a <strong>distribution</strong> to
        proxy it as a pull-through cache, independent of any repository's synced
        content (see a repository's <strong>Distributions</strong> tab) - for that use
        case, <strong>On demand</strong> is the usual choice.
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
