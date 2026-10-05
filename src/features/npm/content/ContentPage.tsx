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
import { listAllNpmContent } from "../../../api/client/npm/content";
import { ContentTable } from "./ContentTable";

export function ContentPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const pagination = usePulpPagination();

  // No server-side `name__contains` exists for this endpoint (VERIFIED
  // live) - listAllNpmContent's own comment explains why this fetches
  // everything and filters/paginates client-side instead.
  const contentQuery = useQuery({
    queryKey: ["pulp", "npm", "content", "all"],
    queryFn: listAllNpmContent,
  });
  const { paged, totalCount } = useClientSideSearch(
    contentQuery.data,
    search,
    (pkg) => pkg.name ?? "",
    pagination,
  );
  const isFiltered = search.trim() !== "";

  return (
    <>
      <PageHeader
        title="NPM content"
        description="Packages across every NPM repository Pulp knows about."
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
                  aria-label="Search packages by name"
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
          repositoryKind="npm"
          emptyTitle={isFiltered ? "No matching NPM content" : "No NPM content yet"}
          emptyBody={
            isFiltered
              ? "Try a different search, or clear it to see every package."
              : "Packages appear here once a repository has synced content or a package has been uploaded."
          }
        />
      </PageSection>
    </>
  );
}
