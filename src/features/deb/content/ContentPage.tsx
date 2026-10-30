import { useState } from "react";
import { SearchInput } from "@patternfly/react-core";

import { ListToolbar } from "../../../components/ListToolbar";
import { PageLayout } from "../../../components/PageLayout";
import { usePulpPagination } from "../../../hooks/usePulpPagination";
import { useDebContentQuery } from "./useDebContentQuery";
import { ContentTable } from "./ContentTable";

export function ContentPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const pagination = usePulpPagination(undefined, search);

  const contentQuery = useDebContentQuery({
    limit: pagination.limit,
    offset: pagination.offset,
    package__icontains: search || undefined,
  });
  const isFiltered = search.trim() !== "";

  return (
    <PageLayout
      title="Debian content"
      description="Packages across every Debian repository Pulp knows about."
    >
      {contentQuery.isSuccess &&
      (contentQuery.data.results.length > 0 || pagination.page > 1 || isFiltered) ? (
        <ListToolbar
          search={
            <SearchInput
              aria-label="Search packages by name"
              placeholder="Search by package name…"
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
          itemCount={contentQuery.data?.count ?? 0}
        />
      ) : null}

      <ContentTable
        isPending={contentQuery.isPending}
        isError={contentQuery.isError}
        error={contentQuery.error}
        onRetry={() => contentQuery.refetch()}
        content={contentQuery.data?.results}
        repositoryKind="deb"
        emptyTitle={isFiltered ? "No matching Debian content" : "No Debian content yet"}
        emptyBody={
          isFiltered
            ? "Try a different search, or clear it to see every package."
            : "Packages appear here once a repository has synced content or a package has been uploaded."
        }
      />
    </PageLayout>
  );
}
