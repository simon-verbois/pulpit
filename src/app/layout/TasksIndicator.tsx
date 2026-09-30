import { useQueries } from "@tanstack/react-query";
import { Button } from "@patternfly/react-core";

import { useTasksContext } from "../../api/tasks/TasksContext";
import { getJob } from "../../api/client/pulpitCore/jobs";
import type { Job } from "../../api/client/pulpitCore/types";
import {
  getTask,
  TASK_POLL_INTERVAL_MS,
  TERMINAL_TASK_STATES,
  type PulpTask,
} from "../../api/client/tasks";
import { TERMINAL_JOB_STATUSES } from "../../features/tasks/jobLabel";

function isInFlight(data: PulpTask | Job | undefined): boolean {
  if (!data) return false;
  return "job_type" in data
    ? !TERMINAL_JOB_STATUSES.has(data.status)
    : !TERMINAL_TASK_STATES.has(data.state);
}

function useInFlightCount(): number {
  const { trackedTasks } = useTasksContext();
  // useQueries (rather than useTask-per-item) is the safe way to run a
  // dynamically-sized list of task polls without violating rules of hooks.
  // Same query keys and fetchers as useTask/useJob, so each tracked item
  // still costs one poll, and a job's cache entry is always a plain Job.
  const results = useQueries({
    queries: trackedTasks.map((task) => ({
      queryKey:
        task.kind === "job"
          ? ["pulpit-core", "job", task.href]
          : ["pulp", "task", task.href],
      queryFn: (): Promise<PulpTask | Job> =>
        task.kind === "job" ? getJob(task.href) : getTask(task.href),
      refetchInterval: (query: { state: { data?: PulpTask | Job } }) =>
        query.state.data && !isInFlight(query.state.data) ? false : TASK_POLL_INTERVAL_MS,
    })),
  });
  return results.filter((r) => isInFlight(r.data)).length;
}

// onToggle lets AppShell close the Help panel whenever Tasks is toggled -
// both share Page's one notificationDrawer slot, so only one can be open.
export function TasksIndicator({ onToggle }: { onToggle?: () => void }) {
  const inFlight = useInFlightCount();
  const { isDrawerOpen, setIsDrawerOpen } = useTasksContext();

  return (
    <Button
      variant="plain"
      onClick={() => {
        setIsDrawerOpen(!isDrawerOpen);
        onToggle?.();
      }}
    >
      <span>Tasks</span>
      {inFlight > 0 ? <span className="pulpit-task-count">{inFlight} active</span> : null}
    </Button>
  );
}
