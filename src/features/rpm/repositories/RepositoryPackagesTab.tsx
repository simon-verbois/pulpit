import { useState } from "react";
import { Pagination, Toolbar, ToolbarContent, ToolbarItem } from "@patternfly/react-core";

import { TaskActionButton } from "../../../components/TaskActionButton";
import type { RpmRepository } from "../../../api/client/rpm/types";
import { usePulpPagination } from "../../../hooks/usePulpPagination";
import { useRpmPackagesQuery } from "../packages/useRpmPackagesQuery";
import { PackagesTable } from "../packages/PackagesTable";
import { UploadPackageModal } from "../packages/UploadPackageModal";
import { rpmRepositoryByNameKey, rpmRepositoryVersionsKey } from "./queryKeys";

export function RepositoryPackagesTab({ repository }: { repository: RpmRepository }) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const pagination = usePulpPagination();

  const packagesQuery = useRpmPackagesQuery({
    limit: pagination.limit,
    offset: pagination.offset,
    repository_version: repository.latest_version_href,
  });

  return (
    <>
      {packagesQuery.isSuccess && packagesQuery.data.results.length > 0 ? (
        <Toolbar>
          <ToolbarContent>
            <ToolbarItem>
              <TaskActionButton
                resourceHref={repository.pulp_href}
                taskAction="upload"
                onClick={() => setIsUploadOpen(true)}
              >
                Upload package
              </TaskActionButton>
            </ToolbarItem>
            <ToolbarItem align={{ default: "alignEnd" }}>
              <Pagination
                itemCount={packagesQuery.data?.count ?? 0}
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

      <PackagesTable
        isPending={packagesQuery.isPending}
        isError={packagesQuery.isError}
        error={packagesQuery.error}
        onRetry={() => packagesQuery.refetch()}
        packages={packagesQuery.data?.results}
        emptyTitle="No packages in this repository yet"
        emptyBody="Sync a remote or upload a package to add content to this repository."
        emptyStateVariant="sm"
        emptyAction={
          <TaskActionButton
            resourceHref={repository.pulp_href}
            taskAction="upload"
            onClick={() => setIsUploadOpen(true)}
          >
            Upload package
          </TaskActionButton>
        }
      />

      {isUploadOpen ? (
        <UploadPackageModal
          repositoryHref={repository.pulp_href}
          repositoryName={repository.name}
          invalidateKeys={[
            rpmRepositoryByNameKey(repository.name),
            rpmRepositoryVersionsKey(repository.versions_href),
          ]}
          onClose={() => setIsUploadOpen(false)}
        />
      ) : null}
    </>
  );
}
