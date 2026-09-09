import { Content } from "@patternfly/react-core";

import { DistributionBasePathConvention } from "../DistributionBasePathConvention";

export function FileRepositoriesTopic() {
  return (
    <Content>
      <Content component="p">
        A File repository holds arbitrary file content and tracks it as a sequence of{" "}
        <strong>versions</strong> - every sync, upload, or removal creates a new one. This
        page is the list of every File repository; open one to manage its content and
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
          <strong>Manifest filename</strong> is the name of the file listing published at
          the repository's own distribution URL (defaults to <code>PULP_MANIFEST</code> if
          left blank).
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
          <strong>Create distribution</strong> to get a real, selectable URL.{" "}
          <strong>Delete</strong> removes one.
        </Content>
      </Content>
      <Content component="p">
        If a distribution's URL 404s, the repository almost certainly hasn't been
        published yet - publish it and try again.
      </Content>
      <DistributionBasePathConvention prefix="file" />

      <Content component="h3">The Content tab</Content>
      <Content component="p">
        Lists this repository's files (the same table as the global{" "}
        <strong>Files → Content</strong> page, scoped to this repository).{" "}
        <strong>Upload file</strong> adds a real file directly as a new version, no sync
        required - it needs a <strong>Relative path</strong> since a raw file has no
        inherent path of its own, unlike a package's embedded metadata.
      </Content>

      <Content component="h3">The Versions tab</Content>
      <Content component="p">
        Every version ever created for this repository, newest first, with the current one
        labeled.
      </Content>

      <Content component="h3">The Access tab</Content>
      <Content component="p">
        Grants roles scoped to this one repository - see the <strong>Access</strong> help
        topic for how roles and grants work in general.
      </Content>
    </Content>
  );
}
