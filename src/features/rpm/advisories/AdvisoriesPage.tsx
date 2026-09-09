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
import { useRpmAdvisoriesQuery } from "./useRpmAdvisoriesQuery";
import { AdvisoriesTable } from "./AdvisoriesTable";

export function AdvisoriesPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const pagination = usePulpPagination();

  const advisoriesQuery = useRpmAdvisoriesQuery({
    limit: pagination.limit,
    offset: pagination.offset,
    q: search || undefined,
  });
  const isFiltered = search.trim() !== "";

  return (
    <>
      <PageHeader
        title="RPM advisories"
        description="Security, bugfix, and enhancement updates (errata) across every RPM repository."
      />
      <PageSection hasBodyWrapper={false}>
        {advisoriesQuery.isSuccess &&
        (advisoriesQuery.data.results.length > 0 || isFiltered) ? (
          <Toolbar>
            <ToolbarContent>
              {/* Fixed width - without it, the bar grows/shrinks as the clear
                  ("x") button appears/disappears with typed text (VERIFIED:
                  SearchInput has no intrinsic width of its own). */}
              <ToolbarItem style={{ width: "18rem" }}>
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
              </ToolbarItem>
              <ToolbarItem align={{ default: "alignEnd" }}>
                <Pagination
                  itemCount={advisoriesQuery.data?.count ?? 0}
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

        <AdvisoriesTable
          isPending={advisoriesQuery.isPending}
          isError={advisoriesQuery.isError}
          error={advisoriesQuery.error}
          onRetry={() => advisoriesQuery.refetch()}
          advisories={advisoriesQuery.data?.results}
          emptyTitle={isFiltered ? "No matching RPM advisories" : "No RPM advisories yet"}
          emptyBody={
            isFiltered
              ? "Try a different search, or clear it to see every advisory."
              : "Advisories appear here once a repository has synced content that includes updateinfo."
          }
        />
      </PageSection>
    </>
  );
}
