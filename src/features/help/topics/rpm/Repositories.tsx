import { Content } from "@patternfly/react-core";

export function RpmRepositoriesTopic() {
  return (
    <Content>
      <Content component="p">
        An RPM repository holds package/advisory content and tracks it as a sequence of{" "}
        <strong>versions</strong> - every sync, upload, or prune creates a new one. This
        page is the list of every RPM repository; open one to manage its content and
        configuration.
      </Content>

      <Content component="h3">Creating a repository</Content>
      <Content component="ol">
        <Content component="li">
          Click <strong>Create repository</strong> and give it a <strong>Name</strong>{" "}
          (required) and optional <strong>Description</strong>.
        </Content>
        <Content component="li">
          Pick a <strong>Default remote</strong> if you want <strong>Sync</strong> to work
          without asking each time - create one first on the <strong>Remotes</strong> page
          if none exist yet.
        </Content>
        <Content component="li">
          Leave <strong>Automatically publish</strong> checked (on by default) so a
          distribution always serves this repository's latest content without a manual
          publish step.
        </Content>
        <Content component="li">
          If a <strong>Signing</strong> section appears, it means an administrator has
          enabled repository signing (Administration → Repository Signing) - check{" "}
          <strong>Sign packages</strong>/<strong>Sign repository metadata</strong> to use
          the current signing key for this repository. It's absent entirely if signing
          isn't configured; nothing to do in that case.
        </Content>
      </Content>
      <Content component="p">
        <strong>Edit</strong> (on a repository's own page) changes the same fields,
        including renaming it. <strong>Delete repository</strong> removes it entirely,
        asynchronously (watch the Tasks panel).
      </Content>

      <Content component="h3">Syncing content</Content>
      <Content component="p">
        <strong>Sync</strong> (on the list, or <strong>Sync now</strong> on the
        repository's <strong>Overview</strong> tab) pulls content from the default remote
        in the background - it's disabled until one is set. Every sync creates a new
        repository version, visible on the <strong>Versions</strong> tab.
      </Content>

      <Content component="h3">Making content downloadable</Content>
      <Content component="p">
        Syncing does not make content downloadable by itself - you also need a{" "}
        <strong>distribution</strong>, which publishes the repository at a URL.
      </Content>
      <Content component="ul">
        <Content component="li">
          With <strong>Automatically publish</strong> on, this happens for you after every
          sync or content change.
        </Content>
        <Content component="li">
          Otherwise, use <strong>Publish now</strong> on the <strong>Overview</strong> tab
          after syncing.
        </Content>
        <Content component="li">
          Then go to the <strong>Distributions</strong> tab and click{" "}
          <strong>Create distribution</strong> to get a real URL (shown with a copy
          button) you can point <code>dnf</code>/<code>yum</code> at.{" "}
          <strong>Delete</strong> removes one.
        </Content>
      </Content>
      <Content component="p">
        If a distribution's URL 404s, the repository almost certainly hasn't been
        published yet - publish it and try again.
      </Content>

      <Content component="h3">The Overview tab</Content>
      <Content component="p">
        Shows the repository's name, description, whether a default remote is configured,
        autopublish status, and the <strong>Publish now</strong>/<strong>Sync now</strong>{" "}
        buttons described above. If signing is configured, it also shows{" "}
        <strong>Package signing</strong>/<strong>Metadata signing</strong> status
        (Enabled/ Disabled) and, when package signing is on, the exact{" "}
        <strong>signing fingerprint</strong> in use.
      </Content>

      <Content component="h3">The Packages and Advisories tabs</Content>
      <Content component="p">
        List this repository's packages/advisories (the same tables as the global{" "}
        <strong>RPM → Packages</strong>/<strong>Advisories</strong> pages, scoped to this
        repository). <strong>Upload package</strong> adds a real <code>.rpm</code> file
        directly as a new version, no sync required. <strong>Upload advisory</strong>{" "}
        needs a <strong>JSON document</strong> describing the advisory (id, title, type,
        severity, description, affected packages...) - a real-world{" "}
        <code>updateinfo.xml</code> file is rejected; most advisories arrive automatically
        via sync instead.
      </Content>

      <Content component="h3">The Content tab</Content>
      <Content component="p">
        Lists everything comps.xml-derived and module-related that a sync brought in:
        package groups, categories, environments, langpacks, modulemd/modulemd
        defaults/obsoletes, distribution trees, and repo metadata files - each its own
        collapsible, read-only section. <strong>Upload comps.xml</strong> bulk-creates
        package groups, categories, environments, and langpacks from one file.
      </Content>

      <Content component="h3">The Versions tab</Content>
      <Content component="p">
        Every version ever created for this repository, newest first, with the current one
        labeled. Use <strong>Copy to…</strong> on the current version to copy its entire
        content into a different repository in one step (there's no way to copy only part
        of a version).
      </Content>

      <Content component="h3">The Access tab</Content>
      <Content component="p">
        Grants roles scoped to this one repository - see the <strong>Access</strong> help
        topic for how roles and grants work in general.
      </Content>

      <Content component="h3">Cleaning up old package versions</Content>
      <Content component="p">
        Use <strong>Prune packages…</strong> on the repositories list to remove superseded
        package versions across one or more repositories you check, older than a number of
        days you choose. <strong>Dry run</strong> is on by default - run it once to see
        what would be removed before turning it off to actually delete anything.
      </Content>
    </Content>
  );
}
