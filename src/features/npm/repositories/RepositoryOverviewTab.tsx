import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
} from "@patternfly/react-core";

import { StatusIndicator } from "../../../components/StatusIndicator";
import { RepositorySummary } from "../../../components/RepositorySummary";
import type { NpmRepository } from "../../../api/client/npm/types";

/** No Publish action in the page header - VERIFIED live: unlike gem/hugging_face, this
 * plugin has no publication endpoint at all; a distribution serves this
 * repository's latest version directly, with no publish step. */
export function RepositoryOverviewTab({
  repository,
  onShowVersions,
}: {
  repository: NpmRepository;
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
      <RepositorySummary repository={repository} onShowVersions={onShowVersions} />
    </DescriptionList>
  );
}
