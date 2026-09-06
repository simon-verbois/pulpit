import {
  Button,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
} from "@patternfly/react-core";

import { StatusIndicator } from "../../../components/StatusIndicator";
import type { HuggingFaceRepository } from "../../../api/client/hugging_face/types";
import {
  huggingFaceRepositoriesListRootKey,
  huggingFaceRepositoryByNameKey,
  huggingFaceRepositoryVersionsKey,
} from "./queryKeys";
import { useSyncHuggingFaceRepositoryMutation } from "./useSyncHuggingFaceRepositoryMutation";
import { usePublishHuggingFaceRepositoryMutation } from "./usePublishHuggingFaceRepositoryMutation";

export function RepositoryOverviewTab({
  repository,
}: {
  repository: HuggingFaceRepository;
}) {
  const syncMutation = useSyncHuggingFaceRepositoryMutation();
  const publishMutation = usePublishHuggingFaceRepositoryMutation();

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
        <DescriptionListTerm>Publish</DescriptionListTerm>
        <DescriptionListDescription>
          <Button
            variant="secondary"
            isDisabled={publishMutation.isPending}
            isLoading={publishMutation.isPending}
            // VERIFIED live: unlike RPM/File, this plugin has no
            // `autopublish` field at all - publishing is always this
            // explicit, manual step.
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
                  huggingFaceRepositoryByNameKey(repository.name),
                  huggingFaceRepositoriesListRootKey,
                  huggingFaceRepositoryVersionsKey(repository.versions_href),
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
