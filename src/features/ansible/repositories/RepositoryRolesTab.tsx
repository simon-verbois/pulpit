import { useState } from "react";
import { Pagination, Toolbar, ToolbarContent, ToolbarItem } from "@patternfly/react-core";

import { TaskActionButton } from "../../../components/TaskActionButton";
import type { AnsibleRepository } from "../../../api/client/ansible/types";
import { usePulpPagination } from "../../../hooks/usePulpPagination";
import { useAnsibleRolesQuery } from "../roles/useAnsibleRolesQuery";
import { RolesTable } from "../roles/RolesTable";
import { UploadRoleModal } from "../roles/UploadRoleModal";
import { ansibleRolesListRootKey } from "../roles/queryKeys";
import { ansibleRepositoryByNameKey, ansibleRepositoryVersionsKey } from "./queryKeys";

export function RepositoryRolesTab({ repository }: { repository: AnsibleRepository }) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const pagination = usePulpPagination();

  const rolesQuery = useAnsibleRolesQuery({
    limit: pagination.limit,
    offset: pagination.offset,
    repository_version: repository.latest_version_href,
  });

  return (
    <>
      {rolesQuery.isSuccess && rolesQuery.data.results.length > 0 ? (
        <Toolbar>
          <ToolbarContent>
            <ToolbarItem>
              <TaskActionButton
                resourceHref={repository.pulp_href}
                taskAction="upload"
                onClick={() => setIsUploadOpen(true)}
              >
                Upload role
              </TaskActionButton>
            </ToolbarItem>
            <ToolbarItem align={{ default: "alignEnd" }}>
              <Pagination
                itemCount={rolesQuery.data?.count ?? 0}
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

      <RolesTable
        isPending={rolesQuery.isPending}
        isError={rolesQuery.isError}
        error={rolesQuery.error}
        onRetry={() => rolesQuery.refetch()}
        roles={rolesQuery.data?.results}
        emptyTitle="No roles in this repository yet"
        emptyBody="Sync a remote or upload a role to add content to this repository."
        emptyStateVariant="sm"
        emptyAction={
          <TaskActionButton
            resourceHref={repository.pulp_href}
            taskAction="upload"
            onClick={() => setIsUploadOpen(true)}
          >
            Upload role
          </TaskActionButton>
        }
      />

      {isUploadOpen ? (
        <UploadRoleModal
          repositoryHref={repository.pulp_href}
          repositoryName={repository.name}
          invalidateKeys={[
            ansibleRepositoryByNameKey(repository.name),
            ansibleRepositoryVersionsKey(repository.versions_href),
            ansibleRolesListRootKey,
          ]}
          onClose={() => setIsUploadOpen(false)}
        />
      ) : null}
    </>
  );
}
