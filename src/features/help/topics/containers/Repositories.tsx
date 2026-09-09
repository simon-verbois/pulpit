import { Content } from "@patternfly/react-core";

import { DistributionBasePathConvention } from "../DistributionBasePathConvention";

export function ContainersRepositoriesTopic() {
  return (
    <Content>
      <Content component="p">
        Container repositories hold image content (tags and manifests) synced from a
        registry. The list page lets you search by name, <strong>Sync</strong> a
        repository directly from its row (only enabled once it has a default remote), and{" "}
        <strong>Delete</strong> one.
        <strong>Create repository</strong> only needs a name and, optionally, a default
        remote to sync from later.
      </Content>

      <Content component="h3">A repository's tabs</Content>
      <Content component="ul">
        <Content component="li">
          <strong>Overview</strong> — name, description, default remote, how many versions
          are retained, and a <strong>Sync now</strong> button.
        </Content>
        <Content component="li">
          <strong>Tags</strong> — every tag currently in the repository's latest version.{" "}
          <strong>Tag image…</strong> points a new tag name at an existing manifest (pick
          one from the list — sync or copy content in first if it's empty);{" "}
          <strong>Remove</strong> untags it without deleting the underlying manifest.
        </Content>
        <Content component="li">
          <strong>Manifests</strong> — digest, media type, architecture, OS, and size for
          every manifest synced or copied into the repository. Read-only; manifests arrive
          through sync, copy, or a real registry push, never created by hand here.
        </Content>
        <Content component="li">
          <strong>Versions</strong> — every repository version, each showing its
          tag/manifest counts, with <strong>Copy to…</strong> on the current version to
          copy its tags and manifests into a different repository.
        </Content>
        <Content component="li">
          <strong>Distributions</strong> — see below.
        </Content>
        <Content component="li">
          <strong>Access</strong> — grant or revoke roles scoped to this repository, same
          as every other repository type.
        </Content>
      </Content>

      <Content component="h3">Making content pullable</Content>
      <Content component="p">
        Syncing content into a repository does not make it pullable by itself — you also
        need a <strong>distribution</strong>, created on the repository's{" "}
        <strong>Distributions</strong> tab (<strong>Name</strong>,{" "}
        <strong>Base path</strong>, and an optional <strong>Private</strong> toggle
        requiring authentication to pull). Once created, its row shows a selectable{" "}
        <code>podman pull ...</code> command built from Pulp's own registry path. There is
        no separate publish step here, unlike RPM.
      </Content>
      <DistributionBasePathConvention prefix="container" />
      <Content component="p">
        Deleting a distribution also deletes the repository it points at, including all
        its synced content — the confirmation dialog says so explicitly. This is specific
        to containers: deleting an RPM or Ansible distribution never touches its
        repository.
      </Content>
    </Content>
  );
}
