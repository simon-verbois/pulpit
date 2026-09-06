import { Content } from "@patternfly/react-core";

export function HuggingFaceRemotesTopic() {
  return (
    <Content>
      <Content component="p">
        A remote points at a model/dataset/space on the Hugging Face Hub that a
        repository can sync from. <strong>Create remote</strong> needs a{" "}
        <strong>Name</strong> and a <strong>URL</strong>. <strong>Sync policy</strong>{" "}
        controls how much content is downloaded up front (Immediate/On demand/Streamed).
      </Content>
      <Content component="p">
        <strong>Hub URL</strong> lets you point at a self-hosted or private Hugging Face
        Hub instance instead of the public <code>huggingface.co</code> (defaults to the
        public Hub if left blank). <strong>Hub token</strong> authenticates against
        private/gated repos - like every credential field in this app, it's never shown
        back once saved; leave it blank when editing to keep the existing value.
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
