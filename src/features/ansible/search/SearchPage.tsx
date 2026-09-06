import { useState } from "react";
import {
  Pagination,
  PageSection,
  SearchInput,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";

import { PageHeader } from "../../../components/PageHeader";
import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { EmptyState } from "../../../components/EmptyState";
import { StatusIndicator } from "../../../components/StatusIndicator";
import { usePulpPagination } from "../../../hooks/usePulpPagination";
import { useSearchCollectionVersionsQuery } from "./useSearchCollectionVersionsQuery";

/** Finds a collection across every repository at once - VERIFIED live
 * schema (Galaxy-v3-compatible cross-repository search), a different kind
 * of view from every per-resource list elsewhere in this app. */
export function SearchPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const pagination = usePulpPagination();

  const searchQuery = useSearchCollectionVersionsQuery({
    limit: pagination.limit,
    offset: pagination.offset,
    q: search || undefined,
  });

  return (
    <>
      <PageHeader
        title="Search collections"
        description="Find a collection across every Ansible repository at once."
      />
      <PageSection hasBodyWrapper={false}>
        <Toolbar>
          <ToolbarContent>
            {/* Fixed width - without it, the bar grows/shrinks as the clear
                ("x") button appears/disappears with typed text (VERIFIED:
                SearchInput has no intrinsic width of its own). */}
            <ToolbarItem style={{ width: "18rem" }}>
              <SearchInput
                aria-label="Search collections"
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
                itemCount={searchQuery.data?.meta.count ?? 0}
                page={pagination.page}
                perPage={pagination.perPage}
                onSetPage={pagination.onSetPage}
                onPerPageSelect={pagination.onPerPageSelect}
                isCompact
              />
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>

        {searchQuery.isPending ? <LoadingState label="Searching collections" /> : null}
        {searchQuery.isError ? (
          <ErrorState error={searchQuery.error} onRetry={() => searchQuery.refetch()} />
        ) : null}
        {searchQuery.isSuccess && searchQuery.data.data.length === 0 ? (
          <EmptyState
            title="No collections found"
            body="Try a different search term, or check that a repository has synced content yet."
          />
        ) : null}
        {searchQuery.isSuccess && searchQuery.data.data.length > 0 ? (
          <Table aria-label="Collection search results" variant="compact">
            <Thead>
              <Tr>
                <Th>Namespace</Th>
                <Th>Name</Th>
                <Th>Version</Th>
                <Th>Repository</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {searchQuery.data.data.map((result, index) => (
                <Tr
                  key={`${result.collection_version.pulp_href}-${result.repository.pulp_href}-${index}`}
                >
                  <Td dataLabel="Namespace">{result.collection_version.namespace}</Td>
                  <Td dataLabel="Name">{result.collection_version.name}</Td>
                  <Td dataLabel="Version">{result.collection_version.version}</Td>
                  <Td dataLabel="Repository">{result.repository.name}</Td>
                  <Td dataLabel="Status">
                    {result.is_highest ? (
                      <StatusIndicator isCompact color="blue">
                        Highest
                      </StatusIndicator>
                    ) : null}{" "}
                    {result.is_signed ? (
                      <StatusIndicator isCompact color="green">
                        Signed
                      </StatusIndicator>
                    ) : null}{" "}
                    {result.is_deprecated ? (
                      <StatusIndicator isCompact color="orange">
                        Deprecated
                      </StatusIndicator>
                    ) : null}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        ) : null}
      </PageSection>
    </>
  );
}
