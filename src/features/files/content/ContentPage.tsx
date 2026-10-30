import { useState } from "react";
import { SearchInput } from "@patternfly/react-core";

import { ListToolbar } from "../../../components/ListToolbar";
import { PageLayout } from "../../../components/PageLayout";
import { usePulpPagination } from "../../../hooks/usePulpPagination";
import { useFileContentQuery } from "./useFileContentQuery";
import { ContentTable } from "./ContentTable";

export function ContentPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const pagination = usePulpPagination(undefined, search);

  const contentQuery = useFileContentQuery({
    limit: pagination.limit,
    offset: pagination.offset,
    relative_path__icontains: search || undefined,
  });
  const isFiltered = search.trim() !== "";

  return (
    <PageLayout
      title="File content"
      description="File content across every File repository Pulp knows about."
    >
      {contentQuery.isSuccess &&
      (contentQuery.data.results.length > 0 || pagination.page > 1 || isFiltered) ? (
        <ListToolbar
          search={
            <SearchInput
              aria-label="Search files by relative path"
              placeholder="Search by relative path…"
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
        repositoryKind="file"
        emptyTitle={isFiltered ? "No matching file content" : "No file content yet"}
        emptyBody={
          isFiltered
            ? "Try a different search, or clear it to see every file."
            : "Files appear here once a repository has synced content or a file has been uploaded."
        }
      />
    </PageLayout>
  );
}
