import { useState } from "react";
import { Button, Card, CardBody, CardFooter, CardTitle } from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import { Link } from "react-router-dom";

import type { PulpTask } from "../../api/client/tasks";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { StatusIndicator } from "../../components/StatusIndicator";
import { formatRelativeTime } from "../../lib/relativeTime";
import { TaskDetailModal } from "../tasks/TaskDetailModal";
import { TASK_STATE_COLOR } from "../tasks/taskStateColor";
import { useTasksQuery } from "../tasks/useTasksQuery";

const RECENT_TASKS_LIMIT = 5;

/**
 * The most recent entries of Pulp's own persistent task history (the same
 * `listTasks`/useTasksQuery TasksPage uses - never the masthead's
 * TasksIndicator, which only tracks tasks triggered in this browser tab,
 * src/api/tasks/TasksContext.tsx), so this reflects every operation across
 * every Pulp client, not just this session's own.
 */
export function RecentTasksCard() {
  const [viewingTask, setViewingTask] = useState<PulpTask | null>(null);
  const tasksQuery = useTasksQuery({ limit: RECENT_TASKS_LIMIT, offset: 0 });

  return (
    <>
      <Card isCompact isFullHeight>
        <CardTitle>Recent tasks</CardTitle>
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
            <Table aria-label="Recent tasks" variant="compact" borders={false}>
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th>State</Th>
                  <Th>Created</Th>
                </Tr>
              </Thead>
              <Tbody>
                {tasksQuery.data.results.map((task) => (
                  <Tr
                    key={task.pulp_href}
                    isClickable
                    onRowClick={() => setViewingTask(task)}
                  >
                    <Td dataLabel="Name">
                      <code>{task.name ?? "—"}</code>
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
        <CardFooter>
          <Button
            variant="link"
            isInline
            component={(props) => <Link to="/tasks" {...props} />}
          >
            View all tasks
          </Button>
        </CardFooter>
      </Card>

      {viewingTask ? (
        <TaskDetailModal task={viewingTask} onClose={() => setViewingTask(null)} />
      ) : null}
    </>
  );
}
