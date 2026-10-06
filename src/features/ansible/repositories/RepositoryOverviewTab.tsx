import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
} from "@patternfly/react-core";

import { StatusIndicator } from "../../../components/StatusIndicator";
import { RepositorySummary } from "../../../components/RepositorySummary";
import type { AnsibleRepository } from "../../../api/client/ansible/types";
import { useCollectionSignaturesQuery } from "./useCollectionSignaturesQuery";
import { useCollectionMarksQuery } from "./useCollectionMarksQuery";

export function RepositoryOverviewTab({
  repository,
  onShowVersions,
}: {
  repository: AnsibleRepository;
  onShowVersions: () => void;
}) {
  const signaturesQuery = useCollectionSignaturesQuery(repository.latest_version_href);
  const marksQuery = useCollectionMarksQuery(repository.latest_version_href);

  return (
    <DescriptionList isHorizontal>
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
          {repository.remote ? (
            <StatusIndicator color="blue">Configured</StatusIndicator>
          ) : (
            <StatusIndicator color="grey">None</StatusIndicator>
          )}
        </DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>Retain versions</DescriptionListTerm>
        <DescriptionListDescription>
          {repository.retain_repo_versions ?? "All"}
        </DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>GPG key</DescriptionListTerm>
        <DescriptionListDescription>
          {repository.gpgkey ? (
            <StatusIndicator color="blue">Set</StatusIndicator>
          ) : (
            <StatusIndicator color="grey">None</StatusIndicator>
          )}
        </DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>Private</DescriptionListTerm>
        <DescriptionListDescription>
          {repository.private ? "Yes" : "No"}
        </DescriptionListDescription>
      </DescriptionListGroup>
      <RepositorySummary repository={repository} onShowVersions={onShowVersions} />
      <DescriptionListGroup>
        <DescriptionListTerm>Signatures</DescriptionListTerm>
        <DescriptionListDescription>
          {signaturesQuery.data?.count
            ? `${signaturesQuery.data.count} collection version${signaturesQuery.data.count === 1 ? "" : "s"} signed`
            : "None yet"}
        </DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>Marks</DescriptionListTerm>
        <DescriptionListDescription>
          {marksQuery.data && marksQuery.data.results.length > 0 ? (
            <span className="pulpit-inline-values">
              {[...new Set(marksQuery.data.results.map((mark) => mark.value))].join(", ")}
            </span>
          ) : (
            "None yet"
          )}
        </DescriptionListDescription>
      </DescriptionListGroup>
    </DescriptionList>
  );
}
