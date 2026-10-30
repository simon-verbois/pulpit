import { useState } from "react";
import { ToolbarItem } from "@patternfly/react-core";

import { ListToolbar } from "../../../components/ListToolbar";
import { TaskActionButton } from "../../../components/TaskActionButton";
import type { GemRepository } from "../../../api/client/gem/types";
import { usePulpPagination } from "../../../hooks/usePulpPagination";
import { useGemContentQuery } from "../content/useGemContentQuery";
import { ContentTable } from "../content/ContentTable";
import { UploadContentModal } from "../content/UploadContentModal";
import { gemRepositoryByNameKey, gemRepositoryVersionsKey } from "./queryKeys";

export function RepositoryContentTab({ repository }: { repository: GemRepository }) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const pagination = usePulpPagination();

  const contentQuery = useGemContentQuery({
    limit: pagination.limit,
    offset: pagination.offset,
    repository_version: repository.latest_version_href,
  });

  return (
    <>
      <ListToolbar pagination={pagination} itemCount={contentQuery.data?.count ?? 0}>
        <ToolbarItem>
          <TaskActionButton
            resourceHref={repository.pulp_href}
            taskAction="upload"
            onClick={() => setIsUploadOpen(true)}
          >
            Upload gem
          </TaskActionButton>
        </ToolbarItem>
      </ListToolbar>

      <ContentTable
        isPending={contentQuery.isPending}
        isError={contentQuery.isError}
        error={contentQuery.error}
        onRetry={() => contentQuery.refetch()}
        content={contentQuery.data?.results}
        emptyTitle="No gems in this repository yet"
        emptyBody="Sync a remote or upload a gem to add content to this repository."
        emptyStateVariant="sm"
      />

      {isUploadOpen ? (
        <UploadContentModal
          repositoryHref={repository.pulp_href}
          repositoryName={repository.name}
          invalidateKeys={[
            gemRepositoryByNameKey(repository.name),
            gemRepositoryVersionsKey(repository.versions_href),
          ]}
          onClose={() => setIsUploadOpen(false)}
        />
      ) : null}
    </>
  );
}
