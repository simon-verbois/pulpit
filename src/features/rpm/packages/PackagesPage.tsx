import { useState } from "react";
import { SearchInput } from "@patternfly/react-core";

import { ListToolbar } from "../../../components/ListToolbar";
import { PageLayout } from "../../../components/PageLayout";
import { usePulpPagination } from "../../../hooks/usePulpPagination";
import { useRpmPackagesQuery } from "./useRpmPackagesQuery";
import { PackagesTable } from "./PackagesTable";

export function PackagesPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const pagination = usePulpPagination(undefined, search);

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
    <PageLayout
      title="RPM packages"
      description="Package content across every RPM repository Pulp knows about."
    >
      {packagesQuery.isSuccess &&
      (packagesQuery.data.results.length > 0 || pagination.page > 1 || isFiltered) ? (
        <ListToolbar
          search={
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
          }
          pagination={pagination}
          itemCount={packagesQuery.data?.count ?? 0}
        />
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
    </PageLayout>
  );
}
