import { useState } from "react";
import {
  Button,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
  Label,
} from "@patternfly/react-core";

import type { AnsibleRepository } from "../../../api/client/ansible/types";
import {
  ansibleRepositoriesListRootKey,
  ansibleRepositoryByNameKey,
  ansibleRepositoryVersionsKey,
} from "./queryKeys";
import { useSyncAnsibleRepositoryMutation } from "./useSyncAnsibleRepositoryMutation";
import { useCollectionSignaturesQuery } from "./useCollectionSignaturesQuery";
import { useCollectionMarksQuery } from "./useCollectionMarksQuery";
import { SignContentModal } from "./SignContentModal";
import { MarkContentModal } from "./MarkContentModal";

export function RepositoryOverviewTab({ repository }: { repository: AnsibleRepository }) {
  const [isSignOpen, setIsSignOpen] = useState(false);
  const [markMode, setMarkMode] = useState<"mark" | "unmark" | null>(null);
  const syncMutation = useSyncAnsibleRepositoryMutation();
  const signaturesQuery = useCollectionSignaturesQuery(repository.latest_version_href);
  const marksQuery = useCollectionMarksQuery(repository.latest_version_href);

  return (
    <>
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
          <DescriptionListTerm>GPG key</DescriptionListTerm>
          <DescriptionListDescription>
            {repository.gpgkey ? <Label color="blue">Set</Label> : <Label>None</Label>}
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Private</DescriptionListTerm>
          <DescriptionListDescription>
            {repository.private ? "Yes" : "No"}
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
                    ansibleRepositoryByNameKey(repository.name),
                    ansibleRepositoriesListRootKey,
                    ansibleRepositoryVersionsKey(repository.versions_href),
                  ],
                })
              }
            >
              Sync now
            </Button>
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Signing &amp; marks</DescriptionListTerm>
          <DescriptionListDescription>
            <Flex spaceItems={{ default: "spaceItemsSm" }}>
              <FlexItem>
                <Button variant="secondary" onClick={() => setIsSignOpen(true)}>
                  Sign content…
                </Button>
              </FlexItem>
              <FlexItem>
                <Button variant="secondary" onClick={() => setMarkMode("mark")}>
                  Mark content…
                </Button>
              </FlexItem>
              <FlexItem>
                <Button variant="secondary" onClick={() => setMarkMode("unmark")}>
                  Unmark content…
                </Button>
              </FlexItem>
            </Flex>
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Signatures</DescriptionListTerm>
          <DescriptionListDescription>
            {signaturesQuery.data?.count
              ? `${signaturesQuery.data.count} collection version${signaturesQuery.data.count === 1 ? "" : "s"} signed`
              : "None yet"}
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Marks</DescriptionListTerm>
          <DescriptionListDescription>
            {marksQuery.data && marksQuery.data.results.length > 0 ? (
              <Flex spaceItems={{ default: "spaceItemsSm" }}>
                {[...new Set(marksQuery.data.results.map((mark) => mark.value))].map(
                  (value) => (
                    <FlexItem key={value}>
                      <Label isCompact>{value}</Label>
                    </FlexItem>
                  ),
                )}
              </Flex>
            ) : (
              "None yet"
            )}
          </DescriptionListDescription>
        </DescriptionListGroup>
      </DescriptionList>

      {isSignOpen ? (
        <SignContentModal repository={repository} onClose={() => setIsSignOpen(false)} />
      ) : null}
      {markMode ? (
        <MarkContentModal
          repository={repository}
          mode={markMode}
          onClose={() => setMarkMode(null)}
        />
      ) : null}
    </>
  );
}
