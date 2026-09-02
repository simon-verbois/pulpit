import {
  NotificationDrawerListItem,
  NotificationDrawerListItemBody,
  NotificationDrawerListItemHeader,
} from "@patternfly/react-core";

import { TERMINAL_TASK_STATES, type PulpTaskState } from "../../api/client/tasks";
import { useTrackedTask } from "../../api/tasks/useTrackedTask";
import type { TrackedTask } from "../../api/tasks/TasksContext";
import { formatRelativeTime } from "../../lib/relativeTime";

type Variant = "info" | "success" | "danger" | "warning";

const VARIANT: Record<PulpTaskState, Variant> = {
  waiting: "info",
  running: "info",
  completed: "success",
  failed: "danger",
  canceled: "warning",
  canceling: "warning",
  skipped: "warning",
};

export function TaskListItem({ task }: { task: TrackedTask }) {
  const query = useTrackedTask(task);
  const data = query.data;
  const state = data?.state;
  const variant = state ? VARIANT[state] : "info";
  const isRead = state ? TERMINAL_TASK_STATES.has(state) : false;
  const timestamp = data?.finished_at ?? data?.started_at ?? data?.pulp_created;

  return (
    <NotificationDrawerListItem variant={variant} isRead={isRead}>
      <NotificationDrawerListItemHeader
        variant={variant}
        title={task.label ?? data?.name ?? "Pulp task"}
        srTitle={`${state ?? "loading"} task:`}
      />
      <NotificationDrawerListItemBody
        timestamp={timestamp ? formatRelativeTime(timestamp) : undefined}
      >
        {state ?? "Loading…"}
        {state === "failed" && data?.error?.description ? (
          <div>{data.error.description}</div>
        ) : null}
      </NotificationDrawerListItemBody>
    </NotificationDrawerListItem>
  );
}
