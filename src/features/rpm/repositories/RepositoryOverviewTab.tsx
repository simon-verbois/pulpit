import { Link } from "react-router-dom";
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
} from "@patternfly/react-core";

import { RepositorySummary } from "../../../components/RepositorySummary";
import type { RpmRepository } from "../../../api/client/rpm/types";
import { useRpmRemoteQuery } from "./useRpmRemoteQuery";
import { isUlnRemoteHref } from "../../../api/client/rpm/remotes";

/** Shows which remote the repository syncs from (name, flavor), linked
 * to the Remotes page filtered on it. Falls back to a plain "Configured" if
 * the remote itself can't be read (e.g. no view permission on it). */
function DefaultRemote({ href }: { href: string }) {
  const remoteQuery = useRpmRemoteQuery(href);
  const isUln = isUlnRemoteHref(href);

  if (remoteQuery.isPending) {
    return "Loading…";
  }
  if (!remoteQuery.isSuccess) {
    return "Configured";
  }
  const remote = remoteQuery.data;
  const search = new URLSearchParams({ search: remote.name });
  if (isUln) search.set("kind", "uln");

  return (
    <>
      <Link to={`/rpm/remotes?${search.toString()}`}>{remote.name}</Link>
      {isUln ? " (ULN)" : null}
    </>
  );
}

export function RepositoryOverviewTab({
  repository,
  onShowVersions,
}: {
  repository: RpmRepository;
  onShowVersions: () => void;
}) {
  return (
    <DescriptionList isHorizontal termWidth="20ch">
      <DescriptionListGroup>
        <DescriptionListTerm>Name</DescriptionListTerm>
        <DescriptionListDescription>{repository.name}</DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>Description</DescriptionListTerm>
        <DescriptionListDescription>
          {repository.description ?? "—"}
        </DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>Default remote</DescriptionListTerm>
        <DescriptionListDescription>
          {repository.remote ? <DefaultRemote href={repository.remote} /> : "None"}
        </DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>Autopublish</DescriptionListTerm>
        <DescriptionListDescription>
          {repository.autopublish ? "Yes" : "No"}
        </DescriptionListDescription>
      </DescriptionListGroup>
      <RepositorySummary repository={repository} onShowVersions={onShowVersions} />
      <DescriptionListGroup>
        <DescriptionListTerm>Package signing</DescriptionListTerm>
        <DescriptionListDescription>
          {repository.package_signing_service ? "Enabled" : "Disabled"}
          {/* pulp_rpm signs on upload only (docs/signing.md "Known
            limitations") - this reflects future uploads, never a claim
            about content already in the repository. */}
        </DescriptionListDescription>
      </DescriptionListGroup>
      {repository.package_signing_fingerprint ? (
        <DescriptionListGroup>
          <DescriptionListTerm>Signing fingerprint</DescriptionListTerm>
          <DescriptionListDescription>
            <code>{repository.package_signing_fingerprint.replace(/^v4:/, "")}</code>
          </DescriptionListDescription>
        </DescriptionListGroup>
      ) : null}
      <DescriptionListGroup>
        <DescriptionListTerm>Metadata signing</DescriptionListTerm>
        <DescriptionListDescription>
          {repository.metadata_signing_service ? "Enabled" : "Disabled"}
        </DescriptionListDescription>
      </DescriptionListGroup>
    </DescriptionList>
  );
}
