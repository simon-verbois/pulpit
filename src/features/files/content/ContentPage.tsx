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
import { useFileContentQuery } from "./useFileContentQuery";
import { ContentTable } from "./ContentTable";

export function ContentPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const pagination = usePulpPagination();

  const contentQuery = useFileContentQuery({
    limit: pagination.limit,
    offset: pagination.offset,
    relative_path__icontains: search || undefined,
  });

  return (
    <>
      <PageHeader
        title="File content"
        description="File content across every File repository Pulp knows about."
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
          emptyTitle="No file content yet"
          emptyBody="Files appear here once a repository has synced content or a file has been uploaded."
        />
      </PageSection>
    </>
  );
}
