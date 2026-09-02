import { Content } from "@patternfly/react-core";

export function AnsibleRemotesTopic() {
  return (
    <Content>
      <Content component="p">
        A remote is an external source Pulp can sync Ansible content from. Ansible has{" "}
        <strong>three distinct kinds</strong>, switched with the toggle at the top of this
        page — they're different kinds of Pulp object under the hood, not just a style
        choice, so a remote created under one kind never shows up under another.
      </Content>

      <Content component="h3">Collection remotes</Content>
      <Content component="p">
        For syncing modern collections from Galaxy or Automation Hub. <strong>URL</strong>{" "}
        points at the Galaxy-compatible API root (e.g.{" "}
        <code>https://galaxy.ansible.com/api/</code>). Expand{" "}
        <strong>Collection sync options</strong> to scope a sync to specific collections
        with a <strong>Requirements file</strong> (YAML, same format as{" "}
        <code>ansible-galaxy collection install -r</code>) instead of pulling everything,
        or to set an <strong>Automation Hub token URL</strong>/<strong>token</strong> for
        a private Hub instance.
      </Content>

      <Content component="h3">Git remotes</Content>
      <Content component="p">
        Clones roles directly from a git repository — <strong>Git URL</strong> plus an
        optional <strong>Git ref</strong> (branch, tag, or commit SHA; defaults to the
        repository's default branch if left blank). There's no sync policy here — a git
        clone has no immediate/on-demand distinction. <strong>Metadata only</strong> makes
        Pulp store just metadata and have clients fetch content straight from the remote
        URL, instead of storing the content itself.
      </Content>

      <Content component="h3">Role remotes</Content>
      <Content component="p">
        For classic, pre-collections Galaxy roles — shaped like a standard URL + sync
        policy remote, the same idea as an RPM remote.
      </Content>

      <Content component="h3">Sync policy (Collection and Role remotes)</Content>
      <Content component="p">
        <strong>Immediate</strong> downloads all content now, <strong>On demand</strong>{" "}
        downloads content only when a client actually requests it, and{" "}
        <strong>Streamed</strong> never stores content locally at all. Git remotes don't
        have this field.
      </Content>

      <Content component="h3">Setting up a proxy or authentication</Content>
      <Content component="p">
        Every remote kind has a <strong>Connection settings</strong> section for a proxy
        URL/credentials or origin server credentials. Once saved, Pulpit only shows
        whether a password is currently set, never the value itself — leave a password
        field blank when editing to keep the existing one, or type a new value to replace
        it.
      </Content>

      <Content component="h3">Editing and deleting</Content>
      <Content component="p">
        <strong>Edit</strong> and <strong>Delete</strong> on a remote's row work the same
        way regardless of kind — deleting a remote does not affect repositories or content
        it was previously used to sync, only the remote object itself.
      </Content>
    </Content>
  );
}
