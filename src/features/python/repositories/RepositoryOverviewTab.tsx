import {
  Button,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
} from "@patternfly/react-core";

import { StatusIndicator } from "../../../components/StatusIndicator";
import type { PythonRepository } from "../../../api/client/python/types";
import {
  pythonRepositoriesListRootKey,
  pythonRepositoryByNameKey,
  pythonRepositoryVersionsKey,
} from "./queryKeys";
import { useSyncPythonRepositoryMutation } from "./useSyncPythonRepositoryMutation";
import { usePublishPythonRepositoryMutation } from "./usePublishPythonRepositoryMutation";

export function RepositoryOverviewTab({ repository }: { repository: PythonRepository }) {
  const syncMutation = useSyncPythonRepositoryMutation();
  const publishMutation = usePublishPythonRepositoryMutation();

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
                  pythonRepositoryByNameKey(repository.name),
                  pythonRepositoriesListRootKey,
                  pythonRepositoryVersionsKey(repository.versions_href),
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
