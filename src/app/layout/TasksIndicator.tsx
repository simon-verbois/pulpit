import { useQueries } from "@tanstack/react-query";
import { Button } from "@patternfly/react-core";

import { useTasksContext } from "../../api/tasks/TasksContext";
import {
  getTask,
  TASK_POLL_INTERVAL_MS,
  TERMINAL_TASK_STATES,
  type PulpTaskState,
} from "../../api/client/tasks";

function useInFlightCount(): number {
  const { trackedTasks } = useTasksContext();
  // useQueries (rather than useTask-per-item) is the safe way to run a
  // dynamically-sized list of task polls without violating rules of hooks.
  const results = useQueries({
    queries: trackedTasks.map((task) => ({
      queryKey: ["pulp", "task", task.href],
      queryFn: () => getTask(task.href),
      refetchInterval: (query: { state: { data?: { state: PulpTaskState } } }) => {
        const state = query.state.data?.state;
        return state && TERMINAL_TASK_STATES.has(state) ? false : TASK_POLL_INTERVAL_MS;
      },
    })),
  });
  return results.filter((r) => r.data && !TERMINAL_TASK_STATES.has(r.data.state)).length;
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
