import { useState } from "react";
import { Pagination, Toolbar, ToolbarContent, ToolbarItem } from "@patternfly/react-core";

import { TaskActionButton } from "../../../components/TaskActionButton";
import type { RpmRepository } from "../../../api/client/rpm/types";
import { usePulpPagination } from "../../../hooks/usePulpPagination";
import { useRpmAdvisoriesQuery } from "../advisories/useRpmAdvisoriesQuery";
import { AdvisoriesTable } from "../advisories/AdvisoriesTable";
import { UploadAdvisoryModal } from "../advisories/UploadAdvisoryModal";
import { rpmAdvisoriesListRootKey } from "../advisories/queryKeys";
import { rpmRepositoryByNameKey, rpmRepositoryVersionsKey } from "./queryKeys";

export function RepositoryAdvisoriesTab({ repository }: { repository: RpmRepository }) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const pagination = usePulpPagination();

  const advisoriesQuery = useRpmAdvisoriesQuery({
    limit: pagination.limit,
    offset: pagination.offset,
    repository_version: repository.latest_version_href,
  });

  return (
    <>
      {advisoriesQuery.isSuccess && advisoriesQuery.data.results.length > 0 ? (
        <Toolbar>
          <ToolbarContent>
            <ToolbarItem>
              <TaskActionButton
                resourceHref={repository.pulp_href}
                taskAction="upload"
                onClick={() => setIsUploadOpen(true)}
              >
                Upload advisory
              </TaskActionButton>
            </ToolbarItem>
            <ToolbarItem align={{ default: "alignEnd" }}>
              <Pagination
                itemCount={advisoriesQuery.data?.count ?? 0}
                page={pagination.page}
                perPage={pagination.perPage}
                onSetPage={pagination.onSetPage}
                onPerPageSelect={pagination.onPerPageSelect}
                isCompact
              />
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
      ) : null}

      <AdvisoriesTable
        isPending={advisoriesQuery.isPending}
        isError={advisoriesQuery.isError}
        error={advisoriesQuery.error}
        onRetry={() => advisoriesQuery.refetch()}
        advisories={advisoriesQuery.data?.results}
        emptyTitle="No advisories in this repository yet"
        emptyBody="Sync a remote whose content includes updateinfo, or upload one directly."
        emptyStateVariant="sm"
        emptyAction={
          <TaskActionButton
            resourceHref={repository.pulp_href}
            taskAction="upload"
            onClick={() => setIsUploadOpen(true)}
          >
            Upload advisory
          </TaskActionButton>
        }
      />

      {isUploadOpen ? (
        <UploadAdvisoryModal
          repositoryHref={repository.pulp_href}
          repositoryName={repository.name}
          invalidateKeys={[
            rpmRepositoryByNameKey(repository.name),
            rpmRepositoryVersionsKey(repository.versions_href),
            rpmAdvisoriesListRootKey,
          ]}
          onClose={() => setIsUploadOpen(false)}
        />
      ) : null}
    </>
  );
}
