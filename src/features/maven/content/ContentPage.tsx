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
import { listAllMavenContent } from "../../../api/client/maven/content";
import { ContentTable } from "./ContentTable";

export function ContentPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const pagination = usePulpPagination();

  // No server-side `group_id__contains` exists for this endpoint
  // (VERIFIED live) - listAllMavenContent's own comment explains why this
  // fetches everything and filters/paginates client-side instead.
  const contentQuery = useQuery({
    queryKey: ["pulp", "maven", "content", "all"],
    queryFn: listAllMavenContent,
  });
  const { paged, totalCount } = useClientSideSearch(
    contentQuery.data,
    search,
    (artifact) => artifact.group_id ?? "",
    pagination,
  );
  const isFiltered = search.trim() !== "";

  return (
    <>
      <PageHeader
        title="Maven content"
        description="Artifacts across every Maven repository Pulp knows about."
      />
      <PageSection hasBodyWrapper={false}>
        {contentQuery.isSuccess && (totalCount > 0 || isFiltered) ? (
          <Toolbar>
            <ToolbarContent>
              {/* Fixed width - without it, the bar grows/shrinks as the clear
                  ("x") button appears/disappears with typed text (VERIFIED:
                  SearchInput has no intrinsic width of its own). */}
              <ToolbarItem style={{ width: "18rem" }}>
                <SearchInput
                  aria-label="Search artifacts by group ID"
                  placeholder="Search by group ID…"
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
                  perPageOptions={pagination.perPageOptions}
                  onSetPage={pagination.onSetPage}
                  onPerPageSelect={pagination.onPerPageSelect}
                  isCompact
                />
              </ToolbarItem>
            </ToolbarContent>
          </Toolbar>
        ) : null}

        <ContentTable
          isPending={contentQuery.isPending}
          isError={contentQuery.isError}
          error={contentQuery.error}
          onRetry={() => contentQuery.refetch()}
          content={paged}
          repositoryKind="maven"
          emptyTitle={isFiltered ? "No matching Maven content" : "No Maven content yet"}
          emptyBody={
            isFiltered
              ? "Try a different search, or clear it to see every artifact."
              : "Artifacts appear here once they've been uploaded to a repository."
          }
        />
      </PageSection>
    </>
  );
}
