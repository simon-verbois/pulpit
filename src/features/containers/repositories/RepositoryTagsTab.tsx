import { useState } from "react";
import { Pagination, Toolbar, ToolbarContent, ToolbarItem } from "@patternfly/react-core";

import type {
  ContainerRepository,
  ContainerTag,
} from "../../../api/client/container/types";
import { usePulpPagination } from "../../../hooks/usePulpPagination";
import { useContainerTagsQuery } from "../tags/useContainerTagsQuery";
import { TagsTable } from "../tags/TagsTable";
import {
  containerRepositoryByNameKey,
  containerRepositoryVersionsKey,
} from "./queryKeys";
import { useUntagImageMutation } from "./useTagImageMutation";
import { TaskActionButton } from "../../../components/TaskActionButton";
import { TagImageModal } from "./TagImageModal";

export function RepositoryTagsTab({ repository }: { repository: ContainerRepository }) {
  const [isTagOpen, setIsTagOpen] = useState(false);
  const pagination = usePulpPagination();
  const untagMutation = useUntagImageMutation();

  const tagsQuery = useContainerTagsQuery({
    limit: pagination.limit,
    offset: pagination.offset,
    repository_version: repository.latest_version_href,
  });

  const handleUntag = (tag: ContainerTag) => {
    untagMutation.mutate({
      href: repository.pulp_href,
      repositoryName: repository.name,
      tag: tag.name,
      invalidateKeys: [
        containerRepositoryByNameKey(repository.name),
        containerRepositoryVersionsKey(repository.versions_href),
      ],
    });
  };

  return (
    <>
      <Toolbar>
        <ToolbarContent>
          <ToolbarItem>
            <TaskActionButton
              resourceHref={repository.pulp_href}
              taskAction="tag"
              onClick={() => setIsTagOpen(true)}
            >
              Tag image…
            </TaskActionButton>
          </ToolbarItem>
          <ToolbarItem align={{ default: "alignEnd" }}>
            <Pagination
              itemCount={tagsQuery.data?.count ?? 0}
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

      <TagsTable
        isPending={tagsQuery.isPending}
        isError={tagsQuery.isError}
        error={tagsQuery.error}
        onRetry={() => tagsQuery.refetch()}
        tags={tagsQuery.data?.results}
        emptyTitle="No tags in this repository yet"
        emptyBody="Sync a remote or tag a manifest to add a tag to this repository."
        emptyStateVariant="sm"
        onUntag={handleUntag}
        taskResourceHref={repository.pulp_href}
      />

      {isTagOpen ? (
        <TagImageModal repository={repository} onClose={() => setIsTagOpen(false)} />
      ) : null}
    </>
  );
}
