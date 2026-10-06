import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
} from "@patternfly/react-core";

import { RepositorySummary } from "../../../components/RepositorySummary";
import type { MavenRepository } from "../../../api/client/maven/types";

/** No Sync/Publish actions in the page header - VERIFIED live: this plugin has no
 * `remote` field on Repository and no publication endpoint at all; content
 * only gets in via direct upload (see the Content tab), and a distribution
 * serves this repository's latest version directly, with no publish step. */
export function RepositoryOverviewTab({
  repository,
  onShowVersions,
}: {
  repository: MavenRepository;
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
      <RepositorySummary repository={repository} onShowVersions={onShowVersions} />
    </DescriptionList>
  );
}
