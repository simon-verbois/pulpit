import { useState } from "react";
import { Pagination, Toolbar, ToolbarContent, ToolbarItem } from "@patternfly/react-core";

import { TaskActionButton } from "../../../components/TaskActionButton";
import type { AnsibleRepository } from "../../../api/client/ansible/types";
import { usePulpPagination } from "../../../hooks/usePulpPagination";
import { useCollectionVersionsQuery } from "../collectionVersions/useCollectionVersionsQuery";
import { CollectionVersionsTable } from "../collectionVersions/CollectionVersionsTable";
import { UploadCollectionVersionModal } from "../collectionVersions/UploadCollectionVersionModal";
import { collectionVersionsListRootKey } from "../collectionVersions/queryKeys";
import { ansibleRepositoryByNameKey, ansibleRepositoryVersionsKey } from "./queryKeys";

export function RepositoryCollectionVersionsTab({
  repository,
}: {
  repository: AnsibleRepository;
}) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const pagination = usePulpPagination();

  const collectionVersionsQuery = useCollectionVersionsQuery({
    limit: pagination.limit,
    offset: pagination.offset,
    repository_version: repository.latest_version_href,
  });

  return (
    <>
      {collectionVersionsQuery.isSuccess &&
      collectionVersionsQuery.data.results.length > 0 ? (
        <Toolbar>
          <ToolbarContent>
            <ToolbarItem>
              <TaskActionButton
                resourceHref={repository.pulp_href}
                taskAction="upload"
                onClick={() => setIsUploadOpen(true)}
              >
                Upload collection
              </TaskActionButton>
            </ToolbarItem>
            <ToolbarItem align={{ default: "alignEnd" }}>
              <Pagination
                itemCount={collectionVersionsQuery.data?.count ?? 0}
                page={pagination.page}
                perPage={pagination.perPage}
                perPageOptions={pagination.perPageOptions}
                onSetPage={pagination.onSetPage}
                onPerPageSelect={pagination.onPerPageSelect}
                isCompact
              />
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
      ) : null}

      <CollectionVersionsTable
        isPending={collectionVersionsQuery.isPending}
        isError={collectionVersionsQuery.isError}
        error={collectionVersionsQuery.error}
        onRetry={() => collectionVersionsQuery.refetch()}
        collectionVersions={collectionVersionsQuery.data?.results}
        emptyTitle="No collections in this repository yet"
        emptyBody="Sync a remote or upload a collection to add content to this repository."
        emptyStateVariant="sm"
        emptyAction={
          <TaskActionButton
            resourceHref={repository.pulp_href}
            taskAction="upload"
            onClick={() => setIsUploadOpen(true)}
          >
            Upload collection
          </TaskActionButton>
        }
      />

      {isUploadOpen ? (
        <UploadCollectionVersionModal
          repositoryHref={repository.pulp_href}
          repositoryName={repository.name}
          invalidateKeys={[
            ansibleRepositoryByNameKey(repository.name),
            ansibleRepositoryVersionsKey(repository.versions_href),
            collectionVersionsListRootKey,
          ]}
          onClose={() => setIsUploadOpen(false)}
        />
      ) : null}
    </>
  );
}
