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
import { useMavenContentQuery } from "./useMavenContentQuery";
import { ContentTable } from "./ContentTable";

export function ContentPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const pagination = usePulpPagination();

  const contentQuery = useMavenContentQuery({
    limit: pagination.limit,
    offset: pagination.offset,
    group_id__icontains: search || undefined,
  });

  return (
    <>
      <PageHeader
        title="Maven content"
        description="Artifacts across every Maven repository Pulp knows about."
      />
      <PageSection hasBodyWrapper={false}>
        <Toolbar>
          <ToolbarContent>
            {/* Fixed width - without it, the bar grows/shrinks as the clear
                ("x") button appears/disappears with typed text (VERIFIED:
                SearchInput has no intrinsic width of its own). */}
            <ToolbarItem style={{ width: "18rem" }}>
              <SearchInput
                aria-label="Search artifacts by group ID"
                placeholder="Search by group ID…"
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

        <ContentTable
          isPending={contentQuery.isPending}
          isError={contentQuery.isError}
          error={contentQuery.error}
          onRetry={() => contentQuery.refetch()}
          content={contentQuery.data?.results}
          emptyTitle="No Maven content yet"
          emptyBody="Artifacts appear here once they've been uploaded to a repository."
        />
      </PageSection>
    </>
  );
}
