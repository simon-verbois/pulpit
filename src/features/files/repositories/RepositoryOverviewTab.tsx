import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
} from "@patternfly/react-core";

import { StatusIndicator } from "../../../components/StatusIndicator";
import { TaskActionButton } from "../../../components/TaskActionButton";
import type { FileRepository } from "../../../api/client/file/types";
import {
  fileRepositoriesListRootKey,
  fileRepositoryByNameKey,
  fileRepositoryVersionsKey,
} from "./queryKeys";
import { useSyncFileRepositoryMutation } from "./useSyncFileRepositoryMutation";
import { usePublishFileRepositoryMutation } from "./usePublishFileRepositoryMutation";

export function RepositoryOverviewTab({ repository }: { repository: FileRepository }) {
  const syncMutation = useSyncFileRepositoryMutation();
  const publishMutation = usePublishFileRepositoryMutation();

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
      <DescriptionListGroup>
        <DescriptionListTerm>Publish</DescriptionListTerm>
        <DescriptionListDescription>
          <TaskActionButton
            resourceHref={repository.pulp_href}
            taskAction="publish"
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
          </TaskActionButton>
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
                  fileRepositoryByNameKey(repository.name),
                  fileRepositoriesListRootKey,
                  fileRepositoryVersionsKey(repository.versions_href),
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
