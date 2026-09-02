import { useState } from "react";
import {
  Button,
  Flex,
  FlexItem,
  Label,
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
import { ConfirmDeleteModal } from "../../../components/ConfirmDeleteModal";
import { usePulpPagination } from "../../../hooks/usePulpPagination";
import { contentGuardKindFromPrn } from "../../../api/client/administration/contentGuards";
import type { ContentGuardSummary } from "../../../api/client/administration/types";
import { useContentGuardsQuery } from "./useContentGuardsQuery";
import { useDeleteContentGuardMutation } from "./useDeleteContentGuardMutation";
import { CreateContentGuardModal } from "./CreateContentGuardModal";
import { EditContentGuardModal } from "./EditContentGuardModal";
import { ManageContentGuardAccessModal } from "./ManageContentGuardAccessModal";

export function ContentGuardsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGuard, setEditingGuard] = useState<ContentGuardSummary | null>(null);
  const [managingAccessGuard, setManagingAccessGuard] =
    useState<ContentGuardSummary | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ContentGuardSummary | null>(null);
  const pagination = usePulpPagination();
  const deleteMutation = useDeleteContentGuardMutation();

  const guardsQuery = useContentGuardsQuery({
    limit: pagination.limit,
    offset: pagination.offset,
    name__icontains: search || undefined,
  });

  return (
    <>
      <PageHeader
        title="Content guards"
        description="Extra access checks a distribution can require before serving its content."
        actions={
          <Button onClick={() => setIsCreateOpen(true)}>Create content guard</Button>
        }
      />
      <PageSection hasBodyWrapper={false}>
        <Toolbar>
          <ToolbarContent>
            {/* Fixed width - without it, the bar grows/shrinks as the clear
                ("x") button appears/disappears with typed text (VERIFIED:
                SearchInput has no intrinsic width of its own). */}
            <ToolbarItem style={{ width: "18rem" }}>
              <SearchInput
                aria-label="Search content guards by name"
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
                itemCount={guardsQuery.data?.count ?? 0}
                page={pagination.page}
                perPage={pagination.perPage}
                onSetPage={pagination.onSetPage}
                onPerPageSelect={pagination.onPerPageSelect}
                isCompact
              />
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>

        {guardsQuery.isPending ? <LoadingState label="Loading content guards" /> : null}
        {guardsQuery.isError ? (
          <ErrorState error={guardsQuery.error} onRetry={() => guardsQuery.refetch()} />
        ) : null}
        {guardsQuery.isSuccess && guardsQuery.data.results.length === 0 ? (
          <EmptyState
            title="No content guards yet"
            body="Create one, then set it as a repository distribution's content guard to restrict who can pull from it."
            action={
              <Button onClick={() => setIsCreateOpen(true)}>Create content guard</Button>
            }
          />
        ) : null}
        {guardsQuery.isSuccess && guardsQuery.data.results.length > 0 ? (
          <Table aria-label="Content guards" variant="compact">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Type</Th>
                <Th>Description</Th>
                <Th screenReaderText="Actions" />
              </Tr>
            </Thead>
            <Tbody>
              {guardsQuery.data.results.map((guard) => {
                const kindInfo = contentGuardKindFromPrn(guard.prn);
                return (
                  <Tr key={guard.pulp_href}>
                    <Td dataLabel="Name">{guard.name}</Td>
                    <Td dataLabel="Type">
                      <Label isCompact>{kindInfo?.label ?? "Unknown"}</Label>
                    </Td>
                    <Td dataLabel="Description">{guard.description ?? "—"}</Td>
                    <Td dataLabel="Actions" isActionCell>
                      <Flex
                        flexWrap={{ default: "nowrap" }}
                        spaceItems={{ default: "spaceItemsNone" }}
                        justifyContent={{ default: "justifyContentFlexEnd" }}
                      >
                        {kindInfo?.kind === "rbac" ? (
                          <FlexItem>
                            <Button
                              variant="link"
                              onClick={() => setManagingAccessGuard(guard)}
                            >
                              Access
                            </Button>
                          </FlexItem>
                        ) : null}
                        <FlexItem>
                          <Button variant="link" onClick={() => setEditingGuard(guard)}>
                            Edit
                          </Button>
                        </FlexItem>
                        <FlexItem>
                          <Button
                            variant="link"
                            isDanger
                            onClick={() => setPendingDelete(guard)}
                          >
                            Delete
                          </Button>
                        </FlexItem>
                      </Flex>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        ) : null}
      </PageSection>

      {isCreateOpen ? (
        <CreateContentGuardModal onClose={() => setIsCreateOpen(false)} />
      ) : null}
      {editingGuard ? (
        <EditContentGuardModal
          guard={editingGuard}
          kind={contentGuardKindFromPrn(editingGuard.prn)?.kind ?? "header"}
          onClose={() => setEditingGuard(null)}
        />
      ) : null}
      {managingAccessGuard ? (
        <ManageContentGuardAccessModal
          guardHref={managingAccessGuard.pulp_href}
          guardName={managingAccessGuard.name}
          onClose={() => setManagingAccessGuard(null)}
        />
      ) : null}
      {pendingDelete ? (
        <ConfirmDeleteModal
          itemTypeLabel="content guard"
          itemLabel={pendingDelete.name}
          isDeleting={deleteMutation.isPending}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() =>
            deleteMutation.mutate(
              { href: pendingDelete.pulp_href, name: pendingDelete.name },
              { onSuccess: () => setPendingDelete(null) },
            )
          }
        />
      ) : null}
    </>
  );
}
