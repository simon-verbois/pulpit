import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
} from "@patternfly/react-core";

import { StatusIndicator } from "../../../components/StatusIndicator";
import { TaskActionButton } from "../../../components/TaskActionButton";
import type { NpmRepository } from "../../../api/client/npm/types";
import {
  npmRepositoriesListRootKey,
  npmRepositoryByNameKey,
  npmRepositoryVersionsKey,
} from "./queryKeys";
import { useSyncNpmRepositoryMutation } from "./useSyncNpmRepositoryMutation";

/** No Publish section here - VERIFIED live: unlike gem/hugging_face, this
 * plugin has no publication endpoint at all; a distribution serves this
 * repository's latest version directly, with no publish step. */
export function RepositoryOverviewTab({ repository }: { repository: NpmRepository }) {
  const syncMutation = useSyncNpmRepositoryMutation();

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
        <DescriptionListTerm>Sync</DescriptionListTerm>
        <DescriptionListDescription>
          <TaskActionButton
            resourceHref={repository.pulp_href}
            taskAction="sync"
            isDisabled={!repository.remote || syncMutation.isPending}
            isLoading={syncMutation.isPending}
            title={
              repository.remote
                ? undefined
                : "This repository has no default remote configured"
            }
            onClick={() =>
              syncMutation.mutate({
                href: repository.pulp_href,
                name: repository.name,
                invalidateKeys: [
                  npmRepositoryByNameKey(repository.name),
                  npmRepositoriesListRootKey,
                  npmRepositoryVersionsKey(repository.versions_href),
                ],
              })
            }
          >
            Sync now
          </TaskActionButton>
        </DescriptionListDescription>
      </DescriptionListGroup>
    </DescriptionList>
  );
}
