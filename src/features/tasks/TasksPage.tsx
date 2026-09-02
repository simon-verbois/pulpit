import { useState } from "react";
import {
  Button,
  FormSelect,
  FormSelectOption,
  Label,
  PageSection,
  Pagination,
  SearchInput,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";

import { PageHeader } from "../../components/PageHeader";
import { LoadingState } from "../../components/LoadingState";
import { ErrorState } from "../../components/ErrorState";
import { EmptyState } from "../../components/EmptyState";
import { usePulpPagination } from "../../hooks/usePulpPagination";
import { formatRelativeTime } from "../../lib/relativeTime";
import type { PulpTask, PulpTaskState } from "../../api/client/tasks";
import { CreatedByCell } from "./CreatedByCell";
import { TaskDetailModal } from "./TaskDetailModal";
import { TASK_STATE_COLOR } from "./taskStateColor";
import { useTasksQuery } from "./useTasksQuery";

const STATE_OPTIONS: { value: PulpTaskState | ""; label: string }[] = [
  { value: "", label: "All states" },
  { value: "waiting", label: "Waiting" },
  { value: "running", label: "Running" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "canceling", label: "Canceling" },
  { value: "canceled", label: "Canceled" },
  { value: "skipped", label: "Skipped" },
];

/**
 * The full, persistent task history Pulp itself keeps - every mutation
 * across this app (and every other Pulp client) ultimately lands here, so
 * this is the audit trail for "who did what, when, to what, and did it
 * succeed" (docs/ROADMAP.md "Improved auditability"). Distinct from the
 * masthead Tasks drawer, which only tracks tasks triggered in this
 * browser tab while it's open (see src/api/tasks/TasksContext.tsx).
 */
export function TasksPage() {
  const [stateFilter, setStateFilter] = useState<PulpTaskState | "">("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [viewingTask, setViewingTask] = useState<PulpTask | null>(null);
  const pagination = usePulpPagination();

  const tasksQuery = useTasksQuery({
    limit: pagination.limit,
    offset: pagination.offset,
    state: stateFilter || undefined,
    name__contains: search || undefined,
  });

  return (
    <>
      <PageHeader
        title="Tasks"
        description="The full history of asynchronous Pulp operations, as tracked by Pulp itself."
      />
      <PageSection hasBodyWrapper={false}>
        <Toolbar>
          <ToolbarContent>
            <ToolbarItem>
              <FormSelect
                aria-label="Filter by state"
                value={stateFilter}
                onChange={(_event, value) => setStateFilter(value as PulpTaskState | "")}
              >
                {STATE_OPTIONS.map((option) => (
                  <FormSelectOption
                    key={option.value}
                    value={option.value}
                    label={option.label}
                  />
                ))}
              </FormSelect>
            </ToolbarItem>
            <ToolbarItem style={{ width: "18rem" }}>
              <SearchInput
                aria-label="Search tasks by name"
                placeholder="Search by task name…"
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
                itemCount={tasksQuery.data?.count ?? 0}
                page={pagination.page}
                perPage={pagination.perPage}
                onSetPage={pagination.onSetPage}
                onPerPageSelect={pagination.onPerPageSelect}
                isCompact
              />
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>

        {tasksQuery.isPending ? <LoadingState label="Loading tasks" /> : null}
        {tasksQuery.isError ? (
          <ErrorState error={tasksQuery.error} onRetry={() => tasksQuery.refetch()} />
        ) : null}
        {tasksQuery.isSuccess && tasksQuery.data.results.length === 0 ? (
          <EmptyState
            title="No tasks found"
            body="Tasks appear here once an asynchronous Pulp operation runs, such as a repository sync."
          />
        ) : null}
        {tasksQuery.isSuccess && tasksQuery.data.results.length > 0 ? (
          <Table aria-label="Tasks" variant="compact">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>State</Th>
                <Th>Created by</Th>
                <Th>Created</Th>
                <Th>Finished</Th>
                <Th screenReaderText="Actions" />
              </Tr>
            </Thead>
            <Tbody>
              {tasksQuery.data.results.map((task) => (
                <Tr key={task.pulp_href}>
                  <Td dataLabel="Name">
                    <code>{task.name ?? "—"}</code>
                  </Td>
                  <Td dataLabel="State">
                    <Label color={TASK_STATE_COLOR[task.state]} isCompact>
                      {task.state}
                    </Label>
                  </Td>
                  <Td dataLabel="Created by">
                    <CreatedByCell createdBy={task.created_by} />
                  </Td>
                  <Td dataLabel="Created">
                    {task.pulp_created ? formatRelativeTime(task.pulp_created) : "—"}
                  </Td>
                  <Td dataLabel="Finished">
                    {task.finished_at ? formatRelativeTime(task.finished_at) : "—"}
                  </Td>
                  <Td dataLabel="Actions" isActionCell>
                    <Button variant="link" onClick={() => setViewingTask(task)}>
                      View details
                    </Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        ) : null}
      </PageSection>

      {viewingTask ? (
        <TaskDetailModal task={viewingTask} onClose={() => setViewingTask(null)} />
      ) : null}
    </>
  );
}
