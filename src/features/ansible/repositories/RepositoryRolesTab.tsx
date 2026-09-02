import { useState } from "react";
import {
  Button,
  Pagination,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from "@patternfly/react-core";

import type { AnsibleRepository } from "../../../api/client/ansible/types";
import { usePulpPagination } from "../../../hooks/usePulpPagination";
import { useAnsibleRolesQuery } from "../roles/useAnsibleRolesQuery";
import { RolesTable } from "../roles/RolesTable";
import { UploadRoleModal } from "../roles/UploadRoleModal";
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
      <Toolbar>
        <ToolbarContent>
          <ToolbarItem>
            <Button onClick={() => setIsUploadOpen(true)}>Upload role</Button>
          </ToolbarItem>
          <ToolbarItem align={{ default: "alignEnd" }}>
            <Pagination
              itemCount={rolesQuery.data?.count ?? 0}
              page={pagination.page}
              perPage={pagination.perPage}
              onSetPage={pagination.onSetPage}
              onPerPageSelect={pagination.onPerPageSelect}
              isCompact
            />
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>

      <RolesTable
        isPending={rolesQuery.isPending}
        isError={rolesQuery.isError}
        error={rolesQuery.error}
        onRetry={() => rolesQuery.refetch()}
        roles={rolesQuery.data?.results}
        emptyTitle="No roles in this repository yet"
        emptyBody="Sync a remote or upload a role to add content to this repository."
      />

      {isUploadOpen ? (
        <UploadRoleModal
          repositoryHref={repository.pulp_href}
          repositoryName={repository.name}
          invalidateKeys={[
            ansibleRepositoryByNameKey(repository.name),
            ansibleRepositoryVersionsKey(repository.versions_href),
          ]}
          onClose={() => setIsUploadOpen(false)}
        />
      ) : null}
    </>
  );
}
