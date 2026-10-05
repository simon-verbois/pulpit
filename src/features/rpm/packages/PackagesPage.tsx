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
import { useRpmPackagesQuery } from "./useRpmPackagesQuery";
import { PackagesTable } from "./PackagesTable";

export function PackagesPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const pagination = usePulpPagination();

  const packagesQuery = useRpmPackagesQuery({
    limit: pagination.limit,
    offset: pagination.offset,
    // VERIFIED live against Pulp: rpm packages only supports `name`,
    // `name__contains`, `name__in`, `name__ne`, `name__startswith` -
    // `name__icontains` 400s ("Invalid Filter"), which silently broke this
    // search box (the request errored, but the UI kept showing the
    // previous unfiltered page instead of an error state).
    name__contains: search || undefined,
  });
  const isFiltered = search.trim() !== "";

  return (
    <>
      <PageHeader
        title="RPM packages"
        description="Package content across every RPM repository Pulp knows about."
      />
      <PageSection hasBodyWrapper={false}>
        {packagesQuery.isSuccess &&
        (packagesQuery.data.results.length > 0 || isFiltered) ? (
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
          repositoryKind="rpm"
          emptyTitle={isFiltered ? "No matching RPM packages" : "No RPM packages yet"}
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
