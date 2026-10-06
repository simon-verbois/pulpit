import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
} from "@patternfly/react-core";

import { StatusIndicator } from "../../../components/StatusIndicator";
import { RepositorySummary } from "../../../components/RepositorySummary";
import type { FileRepository } from "../../../api/client/file/types";

export function RepositoryOverviewTab({
  repository,
  onShowVersions,
}: {
  repository: FileRepository;
  onShowVersions: () => void;
}) {
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
        <DescriptionListTerm>Autopublish</DescriptionListTerm>
        <DescriptionListDescription>
          {repository.autopublish ? "Yes" : "No"}
        </DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>Manifest filename</DescriptionListTerm>
        <DescriptionListDescription>
          <code>{repository.manifest || "PULP_MANIFEST"}</code>
        </DescriptionListDescription>
      </DescriptionListGroup>
      <RepositorySummary repository={repository} onShowVersions={onShowVersions} />
    </DescriptionList>
  );
}
