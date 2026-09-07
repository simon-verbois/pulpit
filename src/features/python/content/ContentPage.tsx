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
import { usePythonContentQuery } from "./usePythonContentQuery";
import { ContentTable } from "./ContentTable";

export function ContentPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const pagination = usePulpPagination();

  const contentQuery = usePythonContentQuery({
    limit: pagination.limit,
    offset: pagination.offset,
    // VERIFIED live against Pulp: python packages only supports `name`,
    // `name__contains`, `name__in` - `name__icontains` 400s ("Invalid
    // Filter"), which silently broke this search box (the request errored,
    // but the UI kept showing the previous unfiltered page instead of an
    // error state).
    name__contains: search || undefined,
  });

  return (
    <>
      <PageHeader
        title="Python content"
        description="Packages across every Python repository Pulp knows about."
      />
      <PageSection hasBodyWrapper={false}>
        {contentQuery.isSuccess && contentQuery.data.results.length > 0 ? (
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
                  itemCount={contentQuery.data?.count ?? 0}
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

        <ContentTable
          isPending={contentQuery.isPending}
          isError={contentQuery.isError}
          error={contentQuery.error}
          onRetry={() => contentQuery.refetch()}
          content={contentQuery.data?.results}
          emptyTitle="No Python content yet"
          emptyBody="Packages appear here once a repository has synced content or a package has been uploaded."
        />
      </PageSection>
    </>
  );
}
