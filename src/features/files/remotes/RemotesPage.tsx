import { useState } from "react";
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
import type { FileGitRemote, FileRemote } from "../../../api/client/file/types";
import { useFileRemotesQuery } from "./useFileRemotesQuery";
import { useDeleteFileRemoteMutation } from "./useDeleteFileRemoteMutation";
import { useFileGitRemotesQuery } from "./useFileGitRemotesQuery";
import { useDeleteFileGitRemoteMutation } from "./useDeleteFileGitRemoteMutation";
import { CreateRemoteModal } from "./CreateRemoteModal";
import { CreateGitRemoteModal } from "./CreateGitRemoteModal";
import { EditRemoteModal } from "./EditRemoteModal";
import { EditGitRemoteModal } from "./EditGitRemoteModal";

type RemoteKind = "standard" | "git";

/** Git is a second, separate remote "flavor" (see
 * src/api/client/file/gitRemotes.ts) - a small toggle switches this page
 * between the two rather than merging them into one list, since they're
 * different Pulp objects with different fields/requirements - same pattern
 * as RPM's Standard/ULN toggle. Unlike RPM's ULN flavor, both flavors here
 * support Edit (VERIFIED live: the git remote endpoint accepts PATCH too). */
export function RemotesPage() {
  const [kind, setKind] = useState<RemoteKind>("standard");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRemote, setEditingRemote] = useState<FileRemote | null>(null);
  const [editingGitRemote, setEditingGitRemote] = useState<FileGitRemote | null>(null);
  const [pendingDelete, setPendingDelete] = useState<FileRemote | null>(null);
  const [pendingGitDelete, setPendingGitDelete] = useState<FileGitRemote | null>(null);
  const pagination = usePulpPagination();
  const deleteMutation = useDeleteFileRemoteMutation();
  const deleteGitMutation = useDeleteFileGitRemoteMutation();

  const remotesQuery = useFileRemotesQuery({
    limit: pagination.limit,
    offset: pagination.offset,
    name__icontains: search || undefined,
  });
  const gitRemotesQuery = useFileGitRemotesQuery({
    limit: pagination.limit,
    offset: pagination.offset,
    name__icontains: search || undefined,
  });

  const activeQuery = kind === "standard" ? remotesQuery : gitRemotesQuery;

  return (
    <>
      <PageHeader
        title="File remotes"
        description="External file sources Pulp can sync repositories from."
        actions={
          <Button onClick={() => setIsCreateOpen(true)}>
            {kind === "standard" ? "Create remote" : "Create Git remote"}
          </Button>
        }
      />
      <PageSection hasBodyWrapper={false}>
        {/* The Standard/Git toggle switches between two entirely different
            backing resources (not a filter on one list) - it's the only way
            to reach Git remotes at all, so it stays visible even when the
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
                  text="Git"
                  isSelected={kind === "git"}
                  onChange={() => setKind("git")}
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

        {activeQuery.isPending ? (
          <LoadingState
            gridBreakPoint="grid-lg"
            columns={
              kind === "git"
                ? ["Name", "Git URL", "Git ref", "Actions"]
                : ["Name", "URL", "Policy", "Actions"]
            }
            label="Loading remotes"
          />
        ) : null}
        {activeQuery.isError ? (
          <ErrorState error={activeQuery.error} onRetry={() => activeQuery.refetch()} />
        ) : null}
        {activeQuery.isSuccess && activeQuery.data.results.length === 0 ? (
          <EmptyState
            title={kind === "standard" ? "No File remotes yet" : "No Git remotes yet"}
            body="Create a remote to point at an external file source you want to sync from."
            action={
              <Button onClick={() => setIsCreateOpen(true)}>
                {kind === "standard" ? "Create remote" : "Create Git remote"}
              </Button>
            }
          />
        ) : null}
        {kind === "standard" &&
        remotesQuery.isSuccess &&
        remotesQuery.data.results.length > 0 ? (
          <Table aria-label="File remotes" variant="compact" gridBreakPoint="grid-lg">
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
        {kind === "git" &&
        gitRemotesQuery.isSuccess &&
        gitRemotesQuery.data.results.length > 0 ? (
          <Table aria-label="Git remotes" variant="compact" gridBreakPoint="grid-lg">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Git URL</Th>
                <Th>Git ref</Th>
                <Th screenReaderText="Actions" />
              </Tr>
            </Thead>
            <Tbody>
              {gitRemotesQuery.data.results.map((remote) => (
                <Tr key={remote.pulp_href}>
                  <Td dataLabel="Name">{remote.name}</Td>
                  <Td dataLabel="Git URL">
                    <CopyableText value={remote.url} />
                  </Td>
                  <Td dataLabel="Git ref">{remote.git_ref}</Td>
                  <Td dataLabel="Actions" isActionCell>
                    <Flex
                      flexWrap={{ default: "nowrap" }}
                      spaceItems={{ default: "spaceItemsNone" }}
                      justifyContent={{ default: "justifyContentFlexEnd" }}
                    >
                      <FlexItem>
                        <TaskActionButton
                          resourceHref={remote.pulp_href}
                          taskAction="edit"
                          variant="link"
                          onClick={() => setEditingGitRemote(remote)}
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
                          onClick={() => setPendingGitDelete(remote)}
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
      {isCreateOpen && kind === "git" ? (
        <CreateGitRemoteModal onClose={() => setIsCreateOpen(false)} />
      ) : null}
      {editingRemote ? (
        <EditRemoteModal remote={editingRemote} onClose={() => setEditingRemote(null)} />
      ) : null}
      {editingGitRemote ? (
        <EditGitRemoteModal
          remote={editingGitRemote}
          onClose={() => setEditingGitRemote(null)}
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
      {pendingGitDelete ? (
        <ConfirmDeleteModal
          itemTypeLabel="Git remote"
          itemLabel={pendingGitDelete.name}
          isDeleting={deleteGitMutation.isPending}
          onCancel={() => setPendingGitDelete(null)}
          onConfirm={() =>
            deleteGitMutation.mutate(
              { href: pendingGitDelete.pulp_href, name: pendingGitDelete.name },
              { onSuccess: () => setPendingGitDelete(null) },
            )
          }
        />
      ) : null}
    </>
  );
}
