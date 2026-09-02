import { useState } from "react";
import {
  Pagination,
  PageSection,
  SearchInput,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from "@patternfly/react-core";

import { PageHeader } from "../../../components/PageHeader";
import { usePulpPagination } from "../../../hooks/usePulpPagination";
import { useContainerTagsQuery } from "./useContainerTagsQuery";
import { TagsTable } from "./TagsTable";

export function TagsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const pagination = usePulpPagination();

  const tagsQuery = useContainerTagsQuery({
    limit: pagination.limit,
    offset: pagination.offset,
    name: search || undefined,
  });

  return (
    <>
      <PageHeader
        title="Tags"
        description="Container image tags across every repository Pulp knows about."
      />
      <PageSection hasBodyWrapper={false}>
        <Toolbar>
          <ToolbarContent>
            {/* Fixed width - without it, the bar grows/shrinks as the clear
                ("x") button appears/disappears with typed text (VERIFIED:
                SearchInput has no intrinsic width of its own). */}
            <ToolbarItem style={{ width: "18rem" }}>
              <SearchInput
                aria-label="Search tags by name"
                placeholder="Search by name…"
                value={searchInput}
                onChange={(_event, value) => setSearchInput(value)}
                onSearch={() => setSearch(searchInput)}
                onClear={() => {
                  setSearchInput("");
                  setSearch("");
                }}
              />
            </ToolbarItem>
            <ToolbarItem align={{ default: "alignEnd" }}>
              <Pagination
                itemCount={tagsQuery.data?.count ?? 0}
                page={pagination.page}
                perPage={pagination.perPage}
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
          emptyTitle="No tags yet"
          emptyBody="Tags appear here once a repository has synced content."
        />
      </PageSection>
    </>
  );
}
