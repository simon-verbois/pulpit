import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Pagination,
  PageSection,
  SearchInput,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";

import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { EmptyState } from "../../../components/EmptyState";
import { usePulpPagination } from "../../../hooks/usePulpPagination";
import { useClientSideSearch } from "../../../hooks/useClientSideSearch";
import type { SigningService } from "../../../api/client/administration/types";
import { listAllSigningServices } from "../../../api/client/administration/signingServices";
import { ViewSigningServiceModal } from "./ViewSigningServiceModal";

/** Read-only (VERIFIED live schema: GET only, no create/edit/delete at all -
 * setting one up requires a server-side signing script + a Django
 * management command, out of scope for this UI). Content that needs
 * signing (e.g. an Ansible repository's "Sign content…" action) picks from
 * whatever shows up here. */
export function SigningPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [viewingService, setViewingService] = useState<SigningService | null>(null);
  const pagination = usePulpPagination();

  // No server-side `name__contains` exists for this endpoint (VERIFIED
  // live) - listAllSigningServices's own comment explains why this fetches
  // everything and filters/paginates client-side instead.
  const servicesQuery = useQuery({
    queryKey: ["pulp", "signing-services", "all"],
    queryFn: listAllSigningServices,
  });
  const { paged, totalCount } = useClientSideSearch(
    servicesQuery.data,
    search,
    (service) => service.name,
    pagination,
  );

  const isFiltered = search !== "";

  const toolbar = (
    <Toolbar>
      <ToolbarContent>
        {/* Fixed width - without it, the bar grows/shrinks as the clear
            ("x") button appears/disappears with typed text (VERIFIED:
            SearchInput has no intrinsic width of its own). */}
        <ToolbarItem style={{ width: "18rem" }}>
          <SearchInput
            aria-label="Search signing services by name"
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
  );

  const hasAnyServices = (servicesQuery.data?.length ?? 0) > 0;

  return (
    <>
      <PageSection hasBodyWrapper={false}>
        <Alert
          variant="info"
          isInline
          isPlain
          title="Signing services are read-only here - setting one up requires a signing script and a Django management command run on the Pulp server itself, not something manageable through this UI."
        />

        {servicesQuery.isPending ? (
          <LoadingState label="Loading signing services" />
        ) : null}
        {servicesQuery.isError ? (
          <ErrorState
            error={servicesQuery.error}
            onRetry={() => servicesQuery.refetch()}
          />
        ) : null}
        {servicesQuery.isSuccess && !hasAnyServices ? (
          <EmptyState
            title="No signing services configured"
            body="None are set up on this Pulp instance yet - see the note above for how an administrator would add one."
          />
        ) : null}
        {servicesQuery.isSuccess && hasAnyServices && totalCount === 0 && isFiltered ? (
          <>
            {toolbar}
            <EmptyState
              variant="sm"
              title="No matching signing services"
              body="Try a different search, or clear it to see every signing service."
            />
          </>
        ) : null}
        {servicesQuery.isSuccess && hasAnyServices && totalCount > 0 ? (
          <>
            {toolbar}
            <Table aria-label="Signing services" variant="compact">
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th>Public key fingerprint</Th>
                  <Th screenReaderText="Actions" />
                </Tr>
              </Thead>
              <Tbody>
                {paged.map((service) => (
                  <Tr key={service.pulp_href}>
                    <Td dataLabel="Name">{service.name}</Td>
                    <Td dataLabel="Public key fingerprint">
                      <code>{service.pubkey_fingerprint}</code>
                    </Td>
                    <Td dataLabel="Actions" isActionCell>
                      <Button variant="link" onClick={() => setViewingService(service)}>
                        View
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </>
        ) : null}
      </PageSection>

      {viewingService ? (
        <ViewSigningServiceModal
          service={viewingService}
          onClose={() => setViewingService(null)}
        />
      ) : null}
    </>
  );
}
