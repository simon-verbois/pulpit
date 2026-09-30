import {
  NotificationDrawerListItem,
  NotificationDrawerListItemBody,
  NotificationDrawerListItemHeader,
} from "@patternfly/react-core";

import { useNavigate } from "react-router-dom";

import {
  taskIdFromHref,
  TERMINAL_TASK_STATES,
  type PulpTaskState,
} from "../../api/client/tasks";
import { useTasksContext } from "../../api/tasks/TasksContext";
import { useTrackedJob, useTrackedTask } from "../../api/tasks/useTrackedTask";
import type { JobStatus } from "../../api/client/pulpitCore/types";
import { jobLabel, TERMINAL_JOB_STATUSES } from "./jobLabel";
import type { TrackedTask } from "../../api/tasks/TasksContext";
import { formatRelativeTime } from "../../lib/relativeTime";
import { humanizeTaskName } from "./humanizeTaskName";
import { TaskProgress } from "./TaskProgress";

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

const JOB_VARIANT: Record<JobStatus, Variant> = {
  queued: "info",
  running: "info",
  success: "success",
  failed: "danger",
};

export function TaskListItem({ task }: { task: TrackedTask }) {
  return task.kind === "job" ? <JobItem task={task} /> : <PulpTaskItem task={task} />;
}

/** A tracked pulpit-core job - opens it on the Tasks page's
 * "Background jobs" tab. */
function JobItem({ task }: { task: TrackedTask }) {
  const query = useTrackedJob(task);
  const navigate = useNavigate();
  const { setIsDrawerOpen } = useTasksContext();
  const data = query.data;
  const status = data?.status;
  const variant = status ? JOB_VARIANT[status] : "info";
  const timestamp = data?.finished_at ?? data?.started_at ?? data?.created_at;

  return (
    <NotificationDrawerListItem
      variant={variant}
      isRead={status ? TERMINAL_JOB_STATUSES.has(status) : false}
      onClick={() => {
        setIsDrawerOpen(false);
        navigate(`/tasks?tab=jobs&job=${encodeURIComponent(task.href)}`);
      }}
    >
      <NotificationDrawerListItemHeader
        variant={variant}
        title={task.label ?? (data ? jobLabel(data.job_type) : "Background job")}
        srTitle={`${status ?? "loading"} job:`}
      />
      <NotificationDrawerListItemBody
        timestamp={timestamp ? formatRelativeTime(timestamp) : undefined}
      >
        {status ?? "Loading…"}
        {status === "failed" && data?.error ? <div>{data.error}</div> : null}
      </NotificationDrawerListItemBody>
    </NotificationDrawerListItem>
  );
}

function PulpTaskItem({ task }: { task: TrackedTask }) {
  const query = useTrackedTask(task);
  const navigate = useNavigate();
  const { setIsDrawerOpen } = useTasksContext();
  const data = query.data;
  const state = data?.state;
  const variant = state ? VARIANT[state] : "info";
  const isRead = state ? TERMINAL_TASK_STATES.has(state) : false;
  const timestamp = data?.finished_at ?? data?.started_at ?? data?.pulp_created;

  return (
    // Opens this task on the Tasks page (its detail modal, row highlighted).
    <NotificationDrawerListItem
      variant={variant}
      isRead={isRead}
      onClick={() => {
        setIsDrawerOpen(false);
        navigate(`/tasks?task=${taskIdFromHref(task.href)}`);
      }}
    >
      <NotificationDrawerListItemHeader
        variant={variant}
        title={task.label ?? (data?.name ? humanizeTaskName(data.name) : "Pulp task")}
        srTitle={`${state ?? "loading"} task:`}
      />
      <NotificationDrawerListItemBody
        timestamp={timestamp ? formatRelativeTime(timestamp) : undefined}
      >
        {state ?? "Loading…"}
        {state === "failed" && data?.error?.description ? (
          <div>{data.error.description}</div>
        ) : null}
        {state === "running" ? (
          <div style={{ marginTop: "var(--pf-t--global--spacer--sm)" }}>
            <TaskProgress reports={data?.progress_reports} runningOnly />
          </div>
        ) : null}
      </NotificationDrawerListItemBody>
    </NotificationDrawerListItem>
  );
}
