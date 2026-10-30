import { useState } from "react";
import { SearchInput } from "@patternfly/react-core";

import { ListToolbar } from "../../../components/ListToolbar";
import { PageLayout } from "../../../components/PageLayout";
import { usePulpPagination } from "../../../hooks/usePulpPagination";
import { useRpmAdvisoriesQuery } from "./useRpmAdvisoriesQuery";
import { AdvisoriesTable } from "./AdvisoriesTable";

export function AdvisoriesPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const pagination = usePulpPagination(undefined, search);

  const advisoriesQuery = useRpmAdvisoriesQuery({
    limit: pagination.limit,
    offset: pagination.offset,
    q: search || undefined,
  });
  const isFiltered = search.trim() !== "";

  return (
    <PageLayout
      title="RPM advisories"
      description="Security, bugfix, and enhancement updates (errata) across every RPM repository."
    >
      {advisoriesQuery.isSuccess &&
      (advisoriesQuery.data.results.length > 0 || pagination.page > 1 || isFiltered) ? (
        <ListToolbar
          search={
            <SearchInput
              aria-label="Search advisories"
              placeholder="Search…"
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
          itemCount={advisoriesQuery.data?.count ?? 0}
        />
      ) : null}

      <AdvisoriesTable
        isPending={advisoriesQuery.isPending}
        isError={advisoriesQuery.isError}
        error={advisoriesQuery.error}
        onRetry={() => advisoriesQuery.refetch()}
        advisories={advisoriesQuery.data?.results}
        repositoryKind="rpm"
        emptyTitle={isFiltered ? "No matching RPM advisories" : "No RPM advisories yet"}
        emptyBody={
          isFiltered
            ? "Try a different search, or clear it to see every advisory."
            : "Advisories appear here once a repository has synced content that includes updateinfo."
        }
      />
    </PageLayout>
  );
}
