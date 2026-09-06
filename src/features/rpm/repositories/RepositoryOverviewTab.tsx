import {
  Button,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
} from "@patternfly/react-core";

import { StatusIndicator } from "../../../components/StatusIndicator";
import type { RpmRepository } from "../../../api/client/rpm/types";
import {
  rpmRepositoriesListRootKey,
  rpmRepositoryByNameKey,
  rpmRepositoryVersionsKey,
} from "./queryKeys";
import { useSyncRpmRepositoryMutation } from "./useSyncRpmRepositoryMutation";
import { usePublishRpmRepositoryMutation } from "./usePublishRpmRepositoryMutation";

export function RepositoryOverviewTab({ repository }: { repository: RpmRepository }) {
  const syncMutation = useSyncRpmRepositoryMutation();
  const publishMutation = usePublishRpmRepositoryMutation();

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
                  rpmRepositoryByNameKey(repository.name),
                  rpmRepositoriesListRootKey,
                  rpmRepositoryVersionsKey(repository.versions_href),
                ],
              })
            }
          >
            Sync now
          </Button>
        </DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>Package signing</DescriptionListTerm>
        <DescriptionListDescription>
          {repository.package_signing_service ? (
            <StatusIndicator color="green">Enabled</StatusIndicator>
          ) : (
            <StatusIndicator color="grey">Disabled</StatusIndicator>
          )}
          {/* pulp_rpm signs on upload only (docs/signing.md "Known
              limitations") - this reflects future uploads, never a claim
              about content already in the repository. */}
        </DescriptionListDescription>
      </DescriptionListGroup>
      {repository.package_signing_fingerprint ? (
        <DescriptionListGroup>
          <DescriptionListTerm>Signing fingerprint</DescriptionListTerm>
          <DescriptionListDescription>
            <code>{repository.package_signing_fingerprint.replace(/^v4:/, "")}</code>
          </DescriptionListDescription>
        </DescriptionListGroup>
      ) : null}
      <DescriptionListGroup>
        <DescriptionListTerm>Metadata signing</DescriptionListTerm>
        <DescriptionListDescription>
          {repository.metadata_signing_service ? (
            <StatusIndicator color="green">Enabled</StatusIndicator>
          ) : (
            <StatusIndicator color="grey">Disabled</StatusIndicator>
          )}
        </DescriptionListDescription>
      </DescriptionListGroup>
    </DescriptionList>
  );
}
