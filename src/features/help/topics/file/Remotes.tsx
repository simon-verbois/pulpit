import { Content } from "@patternfly/react-core";

export function FileRemotesTopic() {
  return (
    <Content>
      <Content component="p">
        A remote is an external file source that a repository can sync from. Use the{" "}
        <strong>Standard</strong>/<strong>Git</strong> toggle to switch between the two
        kinds this page manages - they're different Pulp objects, not just a style
        choice.
      </Content>

      <Content component="h3">Standard remotes</Content>
      <Content component="p">
        <strong>Create remote</strong> needs a <strong>Name</strong> and a{" "}
        <strong>URL</strong> (pointing at a manifest of files to sync).{" "}
        <strong>Sync policy</strong> controls how much content is actually downloaded up
        front:
      </Content>
      <Content component="ul">
        <Content component="li">
          <strong>Immediate</strong> - download all content now.
        </Content>
        <Content component="li">
          <strong>On demand</strong> - download content only when a client actually
          requests it.
        </Content>
        <Content component="li">
          <strong>Streamed</strong> - never store content locally at all.
        </Content>
      </Content>
      <Content component="p">
        Expand <strong>Advanced connection settings</strong> to set a proxy
        URL/credentials or origin server credentials for sources that need them. Once
        saved, this page only shows whether a password is currently set, never the value
        itself - leave a field blank when editing to keep the existing one, or type a new
        value to replace it. <strong>Edit</strong> changes any of these fields, including
        the sync policy; <strong>Delete</strong> removes the remote (repositories that
        used it as their default keep working, just without one).
      </Content>

      <Content component="h3">Git remotes</Content>
      <Content component="p">
        Syncs files from a git repository instead of a plain URL listing.{" "}
        <strong>Create Git remote</strong> needs the <strong>Git URL</strong> and an
        optional <strong>Git ref</strong> (branch, tag, or commit hash - defaults to{" "}
        <code>HEAD</code> if left blank). There's no sync policy here - a clone has no
        immediate/on demand/streamed distinction. Unlike RPM's ULN remote, a Git remote
        supports <strong>Edit</strong> too, not just create/list/delete.
      </Content>
    </Content>
  );
}
