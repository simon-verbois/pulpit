import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { useClientSideSearch } from "../../../hooks/useClientSideSearch";
import { listAllAnsibleRoles } from "../../../api/client/ansible/roles";
import { RolesTable } from "./RolesTable";

export function RolesPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const pagination = usePulpPagination();

  // No server-side `name__contains` exists for this endpoint (VERIFIED
  // live) - listAllAnsibleRoles's own comment explains why this fetches
  // everything and filters/paginates client-side instead.
  const rolesQuery = useQuery({
    queryKey: ["pulp", "ansible", "roles", "all"],
    queryFn: listAllAnsibleRoles,
  });
  const { paged, totalCount } = useClientSideSearch(
    rolesQuery.data,
    search,
    (role) => role.name,
    pagination,
  );
  const isFiltered = search.trim() !== "";

  return (
    <>
      <PageHeader
        title="Roles"
        description="Classic (pre-collections) Ansible roles across every repository Pulp knows about."
      />
      <PageSection hasBodyWrapper={false}>
        {rolesQuery.isSuccess && (totalCount > 0 || isFiltered) ? (
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
                  itemCount={totalCount}
                  page={pagination.page}
                  perPage={pagination.perPage}
                  perPageOptions={pagination.perPageOptions}
                  onSetPage={pagination.onSetPage}
                  onPerPageSelect={pagination.onPerPageSelect}
                  isCompact
                />
              </ToolbarItem>
            </ToolbarContent>
          </Toolbar>
        ) : null}

        <RolesTable
          isPending={rolesQuery.isPending}
          isError={rolesQuery.isError}
          error={rolesQuery.error}
          onRetry={() => rolesQuery.refetch()}
          roles={paged}
          repositoryKind="ansible"
          emptyTitle={isFiltered ? "No matching roles" : "No roles yet"}
          emptyBody={
            isFiltered
              ? "Try a different search, or clear it to see every role."
              : "Roles appear here once a repository has synced content or a role has been uploaded."
          }
        />
      </PageSection>
    </>
  );
}
