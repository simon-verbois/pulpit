import { useMemo } from "react";
import { Card, CardBody, CardTitle } from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import { useNavigate } from "react-router-dom";

import { taskIdFromHref } from "../../api/client/tasks";
import { primaryTaskResource } from "../../api/client/taskResources";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { StatusIndicator } from "../../components/StatusIndicator";
import { formatRelativeTime } from "../../lib/relativeTime";
import { taskActionLabel } from "../tasks/humanizeTaskName";
import { TaskResourceCell } from "../tasks/TaskResourceCell";
import { TASK_STATE_COLOR } from "../tasks/taskStateColor";
import { useTaskResources } from "../tasks/useTaskResources";
import { useTasksQuery } from "../tasks/useTasksQuery";
import { UiIcon, type UiIconName } from "../../components/icons/UiIcon";

const RECENT_TASKS_LIMIT = 5;

function taskIcon(name: string | undefined): UiIconName {
  if (!name) return "tasks";
  if (/import|download|synchroniz|sync/i.test(name)) return "download";
  if (/upload|publish|sign/i.test(name)) return "upload";
  return "tasks";
}

/**
 * The most recent entries of Pulp's own persistent task history (the same
 * `listTasks`/useTasksQuery TasksPage uses - never the masthead's
 * TasksIndicator, which only tracks tasks triggered in this browser tab,
 * src/api/tasks/TasksContext.tsx), so this reflects every operation across
 * every Pulp client, not just this session's own. A row opens that task on
 * the Tasks page, like the masthead drawer does.
 */
export function RecentTasksCard() {
  const navigate = useNavigate();
  const tasksQuery = useTasksQuery({ limit: RECENT_TASKS_LIMIT, offset: 0 });
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

  return (
    <Card isCompact isFullHeight className="pulpit-dashboard-panel">
      <CardTitle>System task log</CardTitle>
      <CardBody>
        {tasksQuery.isPending ? <LoadingState label="Loading recent tasks" /> : null}
        {tasksQuery.isError ? (
          <ErrorState error={tasksQuery.error} onRetry={() => tasksQuery.refetch()} />
        ) : null}
        {tasksQuery.isSuccess && tasksQuery.data.results.length === 0 ? (
          <EmptyState
            variant="xs"
            title="No tasks yet"
            body="They appear here once an asynchronous Pulp operation runs, such as a repository sync."
          />
        ) : null}
        {tasksQuery.isSuccess && tasksQuery.data.results.length > 0 ? (
          <Table aria-label="System task log" variant="compact" borders={false}>
            <Thead>
              <Tr>
                <Th>Task</Th>
                <Th>Resource</Th>
                <Th>State</Th>
                <Th>Created</Th>
              </Tr>
            </Thead>
            <Tbody>
              {rows.map(({ task, resource }) => (
                <Tr
                  key={task.pulp_href}
                  isClickable
                  onRowClick={() =>
                    navigate(`/tasks?task=${taskIdFromHref(task.pulp_href)}`)
                  }
                >
                  <Td dataLabel="Task">
                    <span className="pulpit-task-type">
                      <UiIcon name={taskIcon(task.name)} size="1.25rem" />
                      {task.name ? taskActionLabel(task.name) : "—"}
                    </span>
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
                  </Td>
                  <Td dataLabel="Created">
                    {task.pulp_created ? formatRelativeTime(task.pulp_created) : "—"}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        ) : null}
      </CardBody>
    </Card>
  );
}
