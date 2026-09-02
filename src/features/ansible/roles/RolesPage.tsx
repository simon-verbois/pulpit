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
import { useAnsibleRolesQuery } from "./useAnsibleRolesQuery";
import { RolesTable } from "./RolesTable";

export function RolesPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const pagination = usePulpPagination();

  const rolesQuery = useAnsibleRolesQuery({
    limit: pagination.limit,
    offset: pagination.offset,
    name: search || undefined,
  });

  return (
    <>
      <PageHeader
        title="Roles"
        description="Classic (pre-collections) Ansible roles across every repository Pulp knows about."
      />
      <PageSection hasBodyWrapper={false}>
        <Toolbar>
          <ToolbarContent>
            {/* Fixed width - without it, the bar grows/shrinks as the clear
                ("x") button appears/disappears with typed text (VERIFIED:
                SearchInput has no intrinsic width of its own). */}
            <ToolbarItem style={{ width: "18rem" }}>
              <SearchInput
                aria-label="Search roles by name"
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
                itemCount={rolesQuery.data?.count ?? 0}
                page={pagination.page}
                perPage={pagination.perPage}
                onSetPage={pagination.onSetPage}
                onPerPageSelect={pagination.onPerPageSelect}
                isCompact
              />
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>

        <RolesTable
          isPending={rolesQuery.isPending}
          isError={rolesQuery.isError}
          error={rolesQuery.error}
          onRetry={() => rolesQuery.refetch()}
          roles={rolesQuery.data?.results}
          emptyTitle="No roles yet"
          emptyBody="Roles appear here once a repository has synced content or a role has been uploaded."
        />
      </PageSection>
    </>
  );
}
