import {
  Button,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Label,
} from "@patternfly/react-core";

import type { ContainerRepository } from "../../../api/client/container/types";
import {
  containerRepositoriesListRootKey,
  containerRepositoryByNameKey,
  containerRepositoryVersionsKey,
} from "./queryKeys";
import { useSyncContainerRepositoryMutation } from "./useSyncContainerRepositoryMutation";

/** No publish/publication concept at all (VERIFIED live schema, same as
 * Ansible) - a distribution serves the repository/repository version
 * directly. */
export function RepositoryOverviewTab({
  repository,
}: {
  repository: ContainerRepository;
}) {
  const syncMutation = useSyncContainerRepositoryMutation();

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
            <Label color="blue">Configured</Label>
          ) : (
            <Label>None</Label>
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
                  containerRepositoryByNameKey(repository.name),
                  containerRepositoriesListRootKey,
                  containerRepositoryVersionsKey(repository.versions_href),
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
