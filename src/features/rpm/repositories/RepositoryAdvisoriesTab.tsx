import { useState } from "react";
import {
  Button,
  Pagination,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from "@patternfly/react-core";

import type { RpmRepository } from "../../../api/client/rpm/types";
import { usePulpPagination } from "../../../hooks/usePulpPagination";
import { useRpmAdvisoriesQuery } from "../advisories/useRpmAdvisoriesQuery";
import { AdvisoriesTable } from "../advisories/AdvisoriesTable";
import { UploadAdvisoryModal } from "../advisories/UploadAdvisoryModal";
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
      <Toolbar>
        <ToolbarContent>
          <ToolbarItem>
            <Button onClick={() => setIsUploadOpen(true)}>Upload advisory</Button>
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

      <AdvisoriesTable
        isPending={advisoriesQuery.isPending}
        isError={advisoriesQuery.isError}
        error={advisoriesQuery.error}
        onRetry={() => advisoriesQuery.refetch()}
        advisories={advisoriesQuery.data?.results}
        emptyTitle="No advisories in this repository yet"
        emptyBody="Sync a remote whose content includes updateinfo, or upload one directly."
        emptyStateVariant="sm"
      />

      {isUploadOpen ? (
        <UploadAdvisoryModal
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
