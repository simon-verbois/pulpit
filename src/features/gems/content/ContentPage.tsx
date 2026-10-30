import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SearchInput } from "@patternfly/react-core";

import { ListToolbar } from "../../../components/ListToolbar";
import { PageLayout } from "../../../components/PageLayout";
import { usePulpPagination } from "../../../hooks/usePulpPagination";
import { useClientSideSearch } from "../../../hooks/useClientSideSearch";
import { listAllGemContent } from "../../../api/client/gem/content";
import { ContentTable } from "./ContentTable";

export function ContentPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const pagination = usePulpPagination(undefined, search);

  // No server-side `name__contains` exists for this endpoint (VERIFIED
  // live) - listAllGemContent's own comment explains why this fetches
  // everything and filters/paginates client-side instead.
  const contentQuery = useQuery({
    queryKey: ["pulp", "gem", "content", "all"],
    queryFn: listAllGemContent,
  });
  const { paged, totalCount } = useClientSideSearch(
    contentQuery.data,
    search,
    (gem) => gem.name ?? "",
    pagination,
  );
  const isFiltered = search.trim() !== "";

  return (
    <PageLayout
      title="Gem content"
      description="Gems across every repository Pulp knows about."
    >
      {contentQuery.isSuccess && (totalCount > 0 || isFiltered) ? (
        <ListToolbar
          search={
            <SearchInput
              aria-label="Search gems by name"
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

      <ContentTable
        isPending={contentQuery.isPending}
        isError={contentQuery.isError}
        error={contentQuery.error}
        onRetry={() => contentQuery.refetch()}
        content={paged}
        repositoryKind="gem"
        emptyTitle={isFiltered ? "No matching gem content" : "No gem content yet"}
        emptyBody={
          isFiltered
            ? "Try a different search, or clear it to see every gem."
            : "Gems appear here once a repository has synced content or a gem has been uploaded."
        }
      />
    </PageLayout>
  );
}
