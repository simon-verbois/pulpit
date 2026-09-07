import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { useClientSideSearch } from "../../../hooks/useClientSideSearch";
import { listAllContainerTags } from "../../../api/client/container/tags";
import { TagsTable } from "./TagsTable";

export function TagsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const pagination = usePulpPagination();

  // No server-side `name__contains` exists for this endpoint (VERIFIED
  // live) - listAllContainerTags's own comment explains why this fetches
  // everything and filters/paginates client-side instead.
  const tagsQuery = useQuery({
    queryKey: ["pulp", "container", "tags", "all"],
    queryFn: listAllContainerTags,
  });
  const { paged, totalCount } = useClientSideSearch(
    tagsQuery.data,
    search,
    (tag) => tag.name,
    pagination,
  );

  return (
    <>
      <PageHeader
        title="Tags"
        description="Container image tags across every repository Pulp knows about."
      />
      <PageSection hasBodyWrapper={false}>
        {tagsQuery.isSuccess && totalCount > 0 ? (
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
                  itemCount={totalCount}
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

        <TagsTable
          isPending={tagsQuery.isPending}
          isError={tagsQuery.isError}
          error={tagsQuery.error}
          onRetry={() => tagsQuery.refetch()}
          tags={paged}
          emptyTitle="No tags yet"
          emptyBody="Tags appear here once a repository has synced content."
        />
      </PageSection>
    </>
  );
}
