import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SearchInput } from "@patternfly/react-core";

import { ListToolbar } from "../../../components/ListToolbar";
import { PageLayout } from "../../../components/PageLayout";
import { usePulpPagination } from "../../../hooks/usePulpPagination";
import { useClientSideSearch } from "../../../hooks/useClientSideSearch";
import { listAllContainerTags } from "../../../api/client/container/tags";
import { TagsTable } from "./TagsTable";

export function TagsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const pagination = usePulpPagination(undefined, search);

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
  const isFiltered = search.trim() !== "";

  return (
    <PageLayout
      title="Tags"
      description="Container image tags across every repository Pulp knows about."
    >
      {tagsQuery.isSuccess && (totalCount > 0 || isFiltered) ? (
        <ListToolbar
          search={
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
          }
          pagination={pagination}
          itemCount={totalCount}
        />
      ) : null}

      <TagsTable
        isPending={tagsQuery.isPending}
        isError={tagsQuery.isError}
        error={tagsQuery.error}
        onRetry={() => tagsQuery.refetch()}
        tags={paged}
        repositoryKind="container"
        emptyTitle={isFiltered ? "No matching tags" : "No tags yet"}
        emptyBody={
          isFiltered
            ? "Try a different search, or clear it to see every tag."
            : "Tags appear here once a repository has synced content."
        }
      />
    </PageLayout>
  );
}
