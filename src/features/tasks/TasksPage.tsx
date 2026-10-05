import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Button,
  Flex,
  FlexItem,
  FormSelect,
  FormSelectOption,
  PageSection,
  Pagination,
  SearchInput,
  Tab,
  TabTitleText,
  Tabs,
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
import { useUrlTab } from "../../hooks/useUrlTab";
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
import { JobsTab } from "./JobsTab";
import { CancelTaskModal } from "./CancelTaskModal";
import { TASK_TYPES } from "./taskTypes";

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
 * Two histories side by side: Pulp's own tasks, and pulpit-core's
 * background jobs (re-signing, key publishing, ...), which run in Pulpit's
 * own worker and never show up in Pulp's task list. Separate tabs rather
 * than one merged table: each source paginates and filters on its own
 * server, so a merged page would never be a correct "newest N".
 */
export function TasksPage() {
  const [activeTab, setActiveTab] = useUrlTab("tasks");

  return (
    <>
      <PageHeader
        title="Tasks"
        description="The full history of asynchronous operations run by Pulp and by Pulpit."
      />
      <PageSection hasBodyWrapper={false} type="tabs">
        <Tabs
          activeKey={activeTab}
          onSelect={(_event, key) => setActiveTab(key)}
          mountOnEnter
        >
          <Tab eventKey="tasks" title={<TabTitleText>Pulp tasks</TabTitleText>}>
            <PageSection hasBodyWrapper={false}>
              <PulpTasksTab />
            </PageSection>
          </Tab>
          <Tab eventKey="jobs" title={<TabTitleText>Background jobs</TabTitleText>}>
            <PageSection hasBodyWrapper={false}>
              <JobsTab />
            </PageSection>
          </Tab>
        </Tabs>
      </PageSection>
    </>
  );
}

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
function PulpTasksTab() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const stateFilter =
    STATE_OPTIONS.find((option) => option.value === searchParams.get("state"))?.value ??
    "";
  const taskType = TASK_TYPES.find((type) => type.value === searchParams.get("type"));
  const [taskToCancel, setTaskToCancel] = useState<PulpTask | null>(null);
  const viewingTaskId = searchParams.get("task");
  const pagination = usePulpPagination();

  const tasksQuery = useTasksQuery({
    limit: pagination.limit,
    offset: pagination.offset,
    state: stateFilter || undefined,
    name__contains: search || undefined,
    name__in: taskType?.names.join(","),
  });

  const isFiltered = search !== "" || stateFilter !== "" || Boolean(taskType);

  const setFilter = (key: "type" | "state", value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    pagination.onSetPage(undefined, 1);
    setSearchParams(next, { replace: true });
  };

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
            onChange={(_event, value) => setFilter("state", value)}
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
        <ToolbarItem>
          <FormSelect
            aria-label="Filter by task type"
            value={taskType?.value ?? ""}
            onChange={(_event, value) => setFilter("type", value)}
          >
            <FormSelectOption value="" label="All types" />
            {TASK_TYPES.map((type) => (
              <FormSelectOption key={type.value} value={type.value} label={type.label} />
            ))}
          </FormSelect>
        </ToolbarItem>
        <ToolbarItem style={{ width: "18rem" }}>
          <SearchInput
            aria-label="Search tasks by name"
            placeholder="Search by task name…"
            value={searchInput}
            onChange={(_event, value) => setSearchInput(value)}
            onSearch={() => {
              setSearch(searchInput);
              pagination.onSetPage(undefined, 1);
            }}
            onClear={() => {
              setSearchInput("");
              setSearch("");
              pagination.onSetPage(undefined, 1);
            }}
          />
        </ToolbarItem>
        <ToolbarItem align={{ default: "alignEnd" }}>
          <Pagination
            itemCount={tasksQuery.data?.count ?? 0}
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

  return (
    <>
      {tasksQuery.isPending ? (
        <LoadingState
          gridBreakPoint="grid-lg"
          columns={[
            "Task",
            "Resource",
            "State",
            "Created by",
            "Created",
            "Duration",
            "Actions",
          ]}
          label="Loading tasks"
        />
      ) : null}
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
            body="Try a different search, task type or state filter."
          />
        </>
      ) : null}
      {tasksQuery.isSuccess && tasksQuery.data.results.length > 0 ? (
        <>
          {toolbar}
          <Table aria-label="Tasks" variant="compact" gridBreakPoint="grid-lg">
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
                  <Td dataLabel="Task">{task.name ? taskActionLabel(task.name) : "—"}</Td>
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
                    <Flex flexWrap={{ default: "nowrap" }}>
                      <FlexItem>
                        <Button variant="link" onClick={() => setViewingTask(task)}>
                          View details
                        </Button>
                      </FlexItem>
                      {task.state === "waiting" || task.state === "running" ? (
                        <FlexItem>
                          <Button
                            variant="link"
                            isDanger
                            onClick={() => setTaskToCancel(task)}
                          >
                            Stop
                          </Button>
                        </FlexItem>
                      ) : null}
                    </Flex>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </>
      ) : null}

      {viewingTaskId ? (
        <TaskDetailModal
          href={apiPath(`/tasks/${viewingTaskId}/`)}
          initialTask={
            rows.find((row) => taskIdFromHref(row.task.pulp_href) === viewingTaskId)?.task
          }
          onClose={() => setViewingTask(null)}
        />
      ) : null}
      {taskToCancel ? (
        <CancelTaskModal task={taskToCancel} onClose={() => setTaskToCancel(null)} />
      ) : null}
    </>
  );
}
