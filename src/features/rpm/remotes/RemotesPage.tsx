import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Button,
  Flex,
  FlexItem,
  Pagination,
  PageSection,
  SearchInput,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  ToggleGroup,
  ToggleGroupItem,
} from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";

import { PageHeader } from "../../../components/PageHeader";
import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { EmptyState } from "../../../components/EmptyState";
import { ConfirmDeleteModal } from "../../../components/ConfirmDeleteModal";
import { CopyableText } from "../../../components/CopyableText";
import { TaskActionButton } from "../../../components/TaskActionButton";
import { usePulpPagination } from "../../../hooks/usePulpPagination";
import type { RpmRemote, RpmUlnRemote } from "../../../api/client/rpm/types";
import { useRpmRemotesQuery } from "./useRpmRemotesQuery";
import { useDeleteRpmRemoteMutation } from "./useDeleteRpmRemoteMutation";
import { useRpmUlnRemotesQuery } from "./useRpmUlnRemotesQuery";
import { useDeleteUlnRemoteMutation } from "./useDeleteUlnRemoteMutation";
import { CreateRemoteModal } from "./CreateRemoteModal";
import { CreateUlnRemoteModal } from "./CreateUlnRemoteModal";
import { EditRemoteModal } from "./EditRemoteModal";
import { EditUlnRemoteModal } from "./EditUlnRemoteModal";
import { TestRemoteModal } from "./TestRemoteModal";

type RemoteKind = "standard" | "uln";

/** Oracle ULN is a second, separate remote "flavor" (see
 * src/api/client/rpm/ulnRemotes.ts) - a small toggle switches this page
 * between the two rather than merging them into one list, since they're
 * different Pulp objects with different fields/requirements. */
export function RemotesPage() {
  // `?search=`/`?kind=uln` pre-filter the list - how a repository's
  // Overview links to its default remote (there is no remote detail page).
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") ?? "";
  const [kind, setKind] = useState<RemoteKind>(
    searchParams.get("kind") === "uln" ? "uln" : "standard",
  );
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRemote, setEditingRemote] = useState<RpmRemote | null>(null);
  const [editingUlnRemote, setEditingUlnRemote] = useState<RpmUlnRemote | null>(null);
  const [pendingDelete, setPendingDelete] = useState<RpmRemote | null>(null);
  const [pendingUlnDelete, setPendingUlnDelete] = useState<RpmUlnRemote | null>(null);
  const [testingRemote, setTestingRemote] = useState<RpmRemote | RpmUlnRemote | null>(
    null,
  );
  const pagination = usePulpPagination();
  const deleteMutation = useDeleteRpmRemoteMutation();
  const deleteUlnMutation = useDeleteUlnRemoteMutation();

  const remotesQuery = useRpmRemotesQuery({
    limit: pagination.limit,
    offset: pagination.offset,
    name__icontains: search || undefined,
  });
  const ulnRemotesQuery = useRpmUlnRemotesQuery({
    limit: pagination.limit,
    offset: pagination.offset,
    name__icontains: search || undefined,
  });

  const activeQuery = kind === "standard" ? remotesQuery : ulnRemotesQuery;

  return (
    <>
      <PageHeader
        title="RPM remotes"
        description="External RPM sources Pulp can sync repositories from."
        actions={
          <Button onClick={() => setIsCreateOpen(true)}>
            {kind === "standard" ? "Create remote" : "Create ULN remote"}
          </Button>
        }
      />
      <PageSection hasBodyWrapper={false}>
        {/* The Standard/ULN toggle switches between two entirely different
            backing resources (not a filter on one list) - it's the only way
            to reach ULN remotes at all, so it stays visible even when the
            active kind's list is empty. Search and pagination, which act on
            the current list, are gated on it being non-empty. */}
        <Toolbar>
          <ToolbarContent>
            <ToolbarItem>
              <ToggleGroup aria-label="Remote type">
                <ToggleGroupItem
                  text="Standard"
                  isSelected={kind === "standard"}
                  onChange={() => setKind("standard")}
                />
                <ToggleGroupItem
                  text="ULN"
                  isSelected={kind === "uln"}
                  onChange={() => setKind("uln")}
                />
              </ToggleGroup>
            </ToolbarItem>
            {activeQuery.isSuccess && activeQuery.data.results.length > 0 ? (
              <>
                {/* Fixed width - without it, the bar grows/shrinks as the clear
                    ("x") button appears/disappears with typed text (VERIFIED:
                    SearchInput has no intrinsic width of its own). */}
                <ToolbarItem style={{ width: "18rem" }}>
                  <SearchInput
                    aria-label="Search remotes by name"
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
                    itemCount={activeQuery.data?.count ?? 0}
                    page={pagination.page}
                    perPage={pagination.perPage}
                    perPageOptions={pagination.perPageOptions}
                    onSetPage={pagination.onSetPage}
                    onPerPageSelect={pagination.onPerPageSelect}
                    isCompact
                  />
                </ToolbarItem>
              </>
            ) : null}
          </ToolbarContent>
        </Toolbar>

        {activeQuery.isPending ? <LoadingState label="Loading remotes" /> : null}
        {activeQuery.isError ? (
          <ErrorState error={activeQuery.error} onRetry={() => activeQuery.refetch()} />
        ) : null}
        {activeQuery.isSuccess && activeQuery.data.results.length === 0 ? (
          <EmptyState
            title={kind === "standard" ? "No RPM remotes yet" : "No ULN remotes yet"}
            body="Create a remote to point at an external RPM repository you want to sync from."
            action={
              <Button onClick={() => setIsCreateOpen(true)}>
                {kind === "standard" ? "Create remote" : "Create ULN remote"}
              </Button>
            }
          />
        ) : null}
        {kind === "standard" &&
        remotesQuery.isSuccess &&
        remotesQuery.data.results.length > 0 ? (
          <Table aria-label="RPM remotes" variant="compact" gridBreakPoint="grid-lg">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>URL</Th>
                <Th>Policy</Th>
                <Th screenReaderText="Actions" />
              </Tr>
            </Thead>
            <Tbody>
              {remotesQuery.data.results.map((remote) => (
                <Tr key={remote.pulp_href}>
                  <Td dataLabel="Name">{remote.name}</Td>
                  <Td dataLabel="URL">
                    <CopyableText value={remote.url} />
                  </Td>
                  <Td dataLabel="Policy">{remote.policy}</Td>
                  <Td dataLabel="Actions" isActionCell>
                    <Flex
                      flexWrap={{ default: "nowrap" }}
                      spaceItems={{ default: "spaceItemsNone" }}
                      justifyContent={{ default: "justifyContentFlexEnd" }}
                    >
                      <FlexItem>
                        <TaskActionButton
                          resourceHref={remote.pulp_href}
                          taskAction="test"
                          variant="link"
                          onClick={() => setTestingRemote(remote)}
                        >
                          Test
                        </TaskActionButton>
                      </FlexItem>
                      <FlexItem>
                        <TaskActionButton
                          resourceHref={remote.pulp_href}
                          taskAction="edit"
                          variant="link"
                          onClick={() => setEditingRemote(remote)}
                        >
                          Edit
                        </TaskActionButton>
                      </FlexItem>
                      <FlexItem>
                        <TaskActionButton
                          resourceHref={remote.pulp_href}
                          taskAction="delete"
                          variant="link"
                          isDanger
                          onClick={() => setPendingDelete(remote)}
                        >
                          Delete
                        </TaskActionButton>
                      </FlexItem>
                    </Flex>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        ) : null}
        {kind === "uln" &&
        ulnRemotesQuery.isSuccess &&
        ulnRemotesQuery.data.results.length > 0 ? (
          <Table aria-label="ULN remotes" variant="compact" gridBreakPoint="grid-lg">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Channel URL</Th>
                <Th>ULN server</Th>
                <Th screenReaderText="Actions" />
              </Tr>
            </Thead>
            <Tbody>
              {ulnRemotesQuery.data.results.map((remote) => (
                <Tr key={remote.pulp_href}>
                  <Td dataLabel="Name">{remote.name}</Td>
                  <Td dataLabel="Channel URL">
                    <CopyableText value={remote.url} />
                  </Td>
                  <Td dataLabel="ULN server">
                    <CopyableText value={remote.uln_server_base_url} />
                  </Td>
                  <Td dataLabel="Actions" isActionCell>
                    <Flex
                      flexWrap={{ default: "nowrap" }}
                      spaceItems={{ default: "spaceItemsNone" }}
                      justifyContent={{ default: "justifyContentFlexEnd" }}
                    >
                      <FlexItem>
                        <TaskActionButton
                          resourceHref={remote.pulp_href}
                          taskAction="test"
                          variant="link"
                          onClick={() => setTestingRemote(remote)}
                        >
                          Test
                        </TaskActionButton>
                      </FlexItem>
                      <FlexItem>
                        <TaskActionButton
                          resourceHref={remote.pulp_href}
                          taskAction="edit"
                          variant="link"
                          onClick={() => setEditingUlnRemote(remote)}
                        >
                          Edit
                        </TaskActionButton>
                      </FlexItem>
                      <FlexItem>
                        <TaskActionButton
                          resourceHref={remote.pulp_href}
                          taskAction="delete"
                          variant="link"
                          isDanger
                          onClick={() => setPendingUlnDelete(remote)}
                        >
                          Delete
                        </TaskActionButton>
                      </FlexItem>
                    </Flex>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        ) : null}
      </PageSection>

      {isCreateOpen && kind === "standard" ? (
        <CreateRemoteModal onClose={() => setIsCreateOpen(false)} />
      ) : null}
      {isCreateOpen && kind === "uln" ? (
        <CreateUlnRemoteModal onClose={() => setIsCreateOpen(false)} />
      ) : null}
      {testingRemote ? (
        <TestRemoteModal remote={testingRemote} onClose={() => setTestingRemote(null)} />
      ) : null}
      {editingRemote ? (
        <EditRemoteModal remote={editingRemote} onClose={() => setEditingRemote(null)} />
      ) : null}
      {editingUlnRemote ? (
        <EditUlnRemoteModal
          remote={editingUlnRemote}
          onClose={() => setEditingUlnRemote(null)}
        />
      ) : null}
      {pendingDelete ? (
        <ConfirmDeleteModal
          itemTypeLabel="remote"
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
      {pendingUlnDelete ? (
        <ConfirmDeleteModal
          itemTypeLabel="ULN remote"
          itemLabel={pendingUlnDelete.name}
          isDeleting={deleteUlnMutation.isPending}
          onCancel={() => setPendingUlnDelete(null)}
          onConfirm={() =>
            deleteUlnMutation.mutate(
              { href: pendingUlnDelete.pulp_href, name: pendingUlnDelete.name },
              { onSuccess: () => setPendingUlnDelete(null) },
            )
          }
        />
      ) : null}
    </>
  );
}
