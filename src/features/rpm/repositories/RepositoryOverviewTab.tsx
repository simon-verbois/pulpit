import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Label,
  Stack,
  StackItem,
} from "@patternfly/react-core";

import { StatusIndicator } from "../../../components/StatusIndicator";
import { TaskActionButton } from "../../../components/TaskActionButton";
import type { RpmRepository } from "../../../api/client/rpm/types";
import {
  rpmRepositoriesListRootKey,
  rpmRepositoryByNameKey,
  rpmRepositoryVersionsKey,
} from "./queryKeys";
import { useSyncRpmRepositoryMutation } from "./useSyncRpmRepositoryMutation";
import { usePublishRpmRepositoryMutation } from "./usePublishRpmRepositoryMutation";
import { useRepositorySigningPolicyQuery } from "./useRepositorySigningPolicyQuery";
import { useRpmRemoteQuery } from "./useRpmRemoteQuery";
import { isUlnRemoteHref } from "../../../api/client/rpm/remotes";
import { ResignRepositoryModal } from "./ResignRepositoryModal";

/** Shows which remote the repository syncs from (name, flavor, URL), linked
 * to the Remotes page filtered on it. Falls back to a plain "Configured" if
 * the remote itself can't be read (e.g. no view permission on it). */
function DefaultRemote({ href }: { href: string }) {
  const remoteQuery = useRpmRemoteQuery(href);
  const isUln = isUlnRemoteHref(href);

  if (remoteQuery.isPending) {
    return <StatusIndicator color="grey">Loading…</StatusIndicator>;
  }
  if (!remoteQuery.isSuccess) {
    return <StatusIndicator color="blue">Configured</StatusIndicator>;
  }
  const remote = remoteQuery.data;
  const search = new URLSearchParams({ search: remote.name });
  if (isUln) search.set("kind", "uln");

  return (
    <Stack>
      <StackItem>
        <Link to={`/rpm/remotes?${search.toString()}`}>{remote.name}</Link>
        {isUln ? (
          <Label
            isCompact
            style={{ marginInlineStart: "var(--pf-t--global--spacer--sm)" }}
          >
            ULN
          </Label>
        ) : null}
      </StackItem>
      <StackItem>
        <Content component="small">
          <code>{remote.url}</code>
        </Content>
      </StackItem>
    </Stack>
  );
}

export function RepositoryOverviewTab({ repository }: { repository: RpmRepository }) {
  const syncMutation = useSyncRpmRepositoryMutation();
  const publishMutation = usePublishRpmRepositoryMutation();
  const policyQuery = useRepositorySigningPolicyQuery();
  const [isResignOpen, setIsResignOpen] = useState(false);
  const signingAvailable = Boolean(
    policyQuery.data?.package_signing_enabled ||
    policyQuery.data?.metadata_signing_enabled,
  );

  return (
    <>
      <DescriptionList isHorizontal termWidth="20ch">
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
              <DefaultRemote href={repository.remote} />
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
                    rpmRepositoryByNameKey(repository.name),
                    rpmRepositoriesListRootKey,
                    rpmRepositoryVersionsKey(repository.versions_href),
                  ],
                })
              }
            >
              Sync now
            </TaskActionButton>
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
        {/* Hidden when signing is off globally (or pulpit-core unreachable) -
          there is no key to re-sign with. */}
        {signingAvailable ? (
          <DescriptionListGroup>
            <DescriptionListTerm>Re-sign</DescriptionListTerm>
            <DescriptionListDescription>
              <TaskActionButton
                resourceHref={repository.pulp_href}
                taskAction="resign"
                variant="secondary"
                title="Check every package against the active signing key and re-sign what isn't signed with it"
                onClick={() => setIsResignOpen(true)}
              >
                Re-sign now
              </TaskActionButton>
            </DescriptionListDescription>
          </DescriptionListGroup>
        ) : null}
      </DescriptionList>
      {isResignOpen ? (
        <ResignRepositoryModal
          repository={repository}
          onClose={() => setIsResignOpen(false)}
        />
      ) : null}
    </>
  );
}
