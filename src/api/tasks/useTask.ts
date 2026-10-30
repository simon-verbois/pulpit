import { useQuery } from "@tanstack/react-query";

import {
  getTask,
  getTaskGroupSummary,
  TASK_POLL_INTERVAL_MS,
  TERMINAL_TASK_STATES,
} from "../client/tasks";

/**
 * Polls a single Pulp task until it reaches a terminal state. See the
 * pulp-tasks skill: never fabricate progress, stop polling on terminal state.
 */
export function useTask(href: string | undefined, isGroup = false) {
  return useQuery({
    queryKey: ["pulp", isGroup ? "task-group" : "task", href],
    queryFn: () =>
      isGroup ? getTaskGroupSummary(href as string) : getTask(href as string),
    enabled: Boolean(href),
    refetchInterval: (query) => {
      const state = query.state.data?.state;
      return state && TERMINAL_TASK_STATES.has(state) ? false : TASK_POLL_INTERVAL_MS;
    },
  });
}
