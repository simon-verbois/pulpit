import {
  Button,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
} from "@patternfly/react-core";

import { StatusIndicator } from "../../../components/StatusIndicator";
import type { DebRepository } from "../../../api/client/deb/types";
import {
  debRepositoriesListRootKey,
  debRepositoryByNameKey,
  debRepositoryVersionsKey,
} from "./queryKeys";
import { useSyncDebRepositoryMutation } from "./useSyncDebRepositoryMutation";
import { usePublishDebRepositoryMutation } from "./usePublishDebRepositoryMutation";

export function RepositoryOverviewTab({ repository }: { repository: DebRepository }) {
  const syncMutation = useSyncDebRepositoryMutation();
  const publishMutation = usePublishDebRepositoryMutation();

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
        <DescriptionListTerm>Publish</DescriptionListTerm>
        <DescriptionListDescription>
          <Button
            variant="secondary"
            isDisabled={publishMutation.isPending}
            isLoading={publishMutation.isPending}
            title={
              repository.autopublish
                ? "Autopublish is on for this repository - only needed to force a republish"
                : undefined
            }
            onClick={() =>
              publishMutation.mutate({
                href: repository.pulp_href,
                name: repository.name,
              })
            }
          >
            Publish now
          </Button>
        </DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>Sync</DescriptionListTerm>
        <DescriptionListDescription>
          <Button
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
                  debRepositoryByNameKey(repository.name),
                  debRepositoriesListRootKey,
                  debRepositoryVersionsKey(repository.versions_href),
                ],
              })
            }
          >
            Sync now
          </Button>
        </DescriptionListDescription>
      </DescriptionListGroup>
    </DescriptionList>
  );
}
