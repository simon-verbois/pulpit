import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Button,
  FormSelect,
  FormSelectOption,
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
import { StatusIndicator } from "../../components/StatusIndicator";
import { usePulpPagination } from "../../hooks/usePulpPagination";
import { formatRelativeTime } from "../../lib/relativeTime";
import { apiPath } from "../../api/client/httpClient";
import {
  taskIdFromHref,
  type PulpTask,
  type PulpTaskState,
} from "../../api/client/tasks";
import { primaryTaskResource } from "../../api/client/taskResources";
import { formatDuration } from "../../lib/duration";
import { CreatedByCell } from "./CreatedByCell";
import { taskActionLabel } from "./humanizeTaskName";
import { TaskDetailModal } from "./TaskDetailModal";
import { TaskProgress } from "./TaskProgress";
import { TaskResourceCell } from "./TaskResourceCell";
import { TASK_STATE_COLOR } from "./taskStateColor";
import { useTaskResources } from "./useTaskResources";
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
 *
 * `?task=<id>` opens that task's detail modal - the drawer links here, and
 * the task need not be on the current page.
 */
export function TasksPage() {
  const [stateFilter, setStateFilter] = useState<PulpTaskState | "">("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const viewingTaskId = searchParams.get("task");
  const pagination = usePulpPagination();

  const tasksQuery = useTasksQuery({
    limit: pagination.limit,
    offset: pagination.offset,
    state: stateFilter || undefined,
    name__contains: search || undefined,
  });

  const isFiltered = search !== "" || stateFilter !== "";

  const rows = useMemo(
    () =>
      (tasksQuery.data?.results ?? []).map((task) => ({
        task,
        resource: primaryTaskResource(task),
      })),
    [tasksQuery.data],
  );
  const resourcesQuery = useTaskResources(
    rows.flatMap((row) => (row.resource ? [row.resource] : [])),
  );

  const setViewingTask = (task: PulpTask | null) => {
    const next = new URLSearchParams(searchParams);
    if (task) {
      next.set("task", taskIdFromHref(task.pulp_href));
    } else {
      next.delete("task");
    }
    setSearchParams(next, { replace: true });
  };

  const toolbar = (
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
  );

  return (
    <>
      <PageHeader
        title="Tasks"
        description="The full history of asynchronous Pulp operations, as tracked by Pulp itself."
      />
      <PageSection hasBodyWrapper={false}>
        {tasksQuery.isPending ? <LoadingState label="Loading tasks" /> : null}
        {tasksQuery.isError ? (
          <ErrorState error={tasksQuery.error} onRetry={() => tasksQuery.refetch()} />
        ) : null}
        {tasksQuery.isSuccess && tasksQuery.data.results.length === 0 && !isFiltered ? (
          <EmptyState
            title="No tasks found"
            body="Tasks appear here once an asynchronous Pulp operation runs, such as a repository sync."
          />
        ) : null}
        {tasksQuery.isSuccess && tasksQuery.data.results.length === 0 && isFiltered ? (
          <>
            {toolbar}
            <EmptyState
              variant="sm"
              title="No matching tasks"
              body="Try a different search or state filter."
            />
          </>
        ) : null}
        {tasksQuery.isSuccess && tasksQuery.data.results.length > 0 ? (
          <>
            {toolbar}
            <Table aria-label="Tasks" variant="compact">
              <Thead>
                <Tr>
                  <Th>Task</Th>
                  <Th>Resource</Th>
                  <Th>State</Th>
                  <Th>Created by</Th>
                  <Th>Created</Th>
                  <Th>Duration</Th>
                  <Th screenReaderText="Actions" />
                </Tr>
              </Thead>
              <Tbody>
                {rows.map(({ task, resource }) => (
                  <Tr
                    key={task.pulp_href}
                    isRowSelected={viewingTaskId === taskIdFromHref(task.pulp_href)}
                  >
                    <Td dataLabel="Task">
                      {task.name ? taskActionLabel(task.name) : "—"}
                    </Td>
                    <Td dataLabel="Resource">
                      <TaskResourceCell
                        resource={resource}
                        resolved={
                          resource ? resourcesQuery.data?.[resource.key] : undefined
                        }
                        isResolving={resourcesQuery.isPending}
                      />
                    </Td>
                    <Td dataLabel="State">
                      <StatusIndicator color={TASK_STATE_COLOR[task.state]} isCompact>
                        {task.state}
                      </StatusIndicator>
                      {task.state === "running" ? (
                        <TaskProgress reports={task.progress_reports} runningOnly />
                      ) : null}
                    </Td>
                    <Td dataLabel="Created by">
                      <CreatedByCell createdBy={task.created_by} />
                    </Td>
                    <Td dataLabel="Created">
                      {task.pulp_created ? formatRelativeTime(task.pulp_created) : "—"}
                    </Td>
                    <Td dataLabel="Duration">
                      {task.started_at
                        ? formatDuration(task.started_at, task.finished_at ?? undefined)
                        : "—"}
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
          </>
        ) : null}
      </PageSection>

      {viewingTaskId ? (
        <TaskDetailModal
          href={apiPath(`/tasks/${viewingTaskId}/`)}
          initialTask={
            rows.find((row) => taskIdFromHref(row.task.pulp_href) === viewingTaskId)?.task
          }
          onClose={() => setViewingTask(null)}
        />
      ) : null}
    </>
  );
}
