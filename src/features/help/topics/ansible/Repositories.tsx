import { Content } from "@patternfly/react-core";

export function AnsibleRepositoriesTopic() {
  return (
    <Content>
      <Content component="p">
        A repository holds Ansible content — collections and roles — and every change to
        it (sync, upload, copy) creates a new, immutable version.
      </Content>

      <Content component="h3">Creating a repository and syncing content</Content>
      <Content component="ol">
        <Content component="li">
          Go to <strong>Ansible → Remotes</strong> and create a remote (any of the three
          kinds — see the Remotes help page).
        </Content>
        <Content component="li">
          On this page, click <strong>Create repository</strong>. Give it a name and,
          optionally, pick the remote you just created as its default (used by{" "}
          <strong>Sync</strong>
          everywhere it's offered).
        </Content>
        <Content component="li">
          Open the new repository and click <strong>Sync</strong> (available both here in
          the repository list and on the repository's own <strong>Overview</strong> tab).
          This runs in the background — watch the <strong>Tasks</strong> panel to see when
          it finishes.
        </Content>
      </Content>
      <Content component="p">
        <strong>Sync</strong> is disabled with an explanatory tooltip until the repository
        has a default remote configured.
      </Content>

      <Content component="h3">The repository detail page's tabs</Content>
      <Content component="ul">
        <Content component="li">
          <strong>Overview</strong> — name, description, default remote, retained version
          count, the repository's own GPG public key (used to verify signed collections
          synced from a remote, not the same thing as Pulp's server-side signing
          services), whether it's private, <strong>Sync now</strong>, and the
          signing/marking actions described below.
        </Content>
        <Content component="li">
          <strong>Collections</strong> — every collection version in the repository's
          current version, plus <strong>Upload collection</strong>.
        </Content>
        <Content component="li">
          <strong>Roles</strong> — every classic role in the repository's current version,
          plus <strong>Upload role</strong>.
        </Content>
        <Content component="li">
          <strong>Versions</strong> — the full version history, each row showing how many
          collections/roles it contains. The current version's row has{" "}
          <strong>Copy to…</strong>, which copies its content into a different repository.
        </Content>
        <Content component="li">
          <strong>Distributions</strong> — see below.
        </Content>
        <Content component="li">
          <strong>Access</strong> — grant or revoke a role (built-in or custom) scoped to
          this one repository, for specific users and/or groups. Pulp automatically grants
          the creator an "owner" role — that row is normal, not something Pulpit added.
        </Content>
      </Content>

      <Content component="h3">Uploading a collection or role by hand</Content>
      <Content component="p">
        On the <strong>Collections</strong> tab, <strong>Upload collection</strong>{" "}
        accepts a real collection tarball built with{" "}
        <code>ansible-galaxy collection build</code> — this adds it to the repository
        directly as a new version, no sync required. The tarball must include a{" "}
        <code>meta/runtime.yml</code> with a <code>requires_ansible</code> value; Pulp
        rejects one missing it with a clear error. On the <strong>Roles</strong> tab,{" "}
        <strong>Upload role</strong> takes a namespace, name, version, and a role tarball.
      </Content>

      <Content component="h3">Making content usable by ansible-galaxy clients</Content>
      <Content component="p">
        Unlike RPM, there's no separate "publish" step — creating a distribution on the{" "}
        <strong>Distributions</strong> tab makes the repository's content servable
        immediately. <strong>Create distribution</strong> gives you a row with a
        ready-to-copy <code>ansible.cfg</code> client-configuration snippet (under{" "}
        <strong>Client configuration</strong>) built from the distribution's own URL, so{" "}
        <code>ansible-galaxy</code> or Automation Hub can point straight at it.{" "}
        <strong>Delete</strong> removes a distribution without touching the underlying
        repository content.
      </Content>

      <Content component="h3">Signing and marking content</Content>
      <Content component="p">
        On the <strong>Overview</strong> tab, <strong>Sign content…</strong> signs every
        collection version currently in the repository using a signing service already
        configured on the Pulp server (setting one up is server-side, not something Pulpit
        can create — see the Administration help page). If none are configured, the dialog
        says so instead of offering a broken picker. <strong>Mark content…</strong> and{" "}
        <strong>Unmark content…</strong> attach or remove an arbitrary text label across
        every collection version in the repository instead — useful for your own tagging
        scheme, not a Pulp built-in concept. The Overview tab also shows how many
        collection versions are currently signed and which mark values are in use.
      </Content>

      <Content component="h3">Deleting a repository</Content>
      <Content component="p">
        <strong>Delete repository</strong> on the detail page runs as a background task,
        like every other repository delete in Pulpit — watch the Tasks panel for it to
        finish before assuming it's gone.
      </Content>
    </Content>
  );
}
