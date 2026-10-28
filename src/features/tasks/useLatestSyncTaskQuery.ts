import { useQuery } from "@tanstack/react-query";

import {
  listTasks,
  TASK_POLL_INTERVAL_MS,
  TERMINAL_TASK_STATES,
} from "../../api/client/tasks";
import { SYNC_TASK_NAMES } from "./taskTypes";
import { useActiveTaskForResource } from "../../api/tasks/TasksContext";
import { latestSyncTaskQueryKey } from "./queryKeys";

/** The most recent sync task that reserved this repository, whatever its
 * outcome - the repository page uses it to surface a failed last sync. */
export function useLatestSyncTaskQuery(repositoryHref: string) {
  const activeTask = useActiveTaskForResource(repositoryHref);
  const activeSyncHref = activeTask?.action === "sync" ? activeTask.href : null;
  return useQuery({
    queryKey: latestSyncTaskQueryKey(repositoryHref, activeSyncHref),
    // Switching back to the idle key after a tracked sync must refresh its outcome.
    staleTime: 0,
    queryFn: async () => {
      const page = await listTasks({
        limit: 1,
        offset: 0,
        name__in: [...SYNC_TASK_NAMES].join(","),
        reserved_resources: repositoryHref,
      });
      return page.results[0] ?? null;
    },
    refetchInterval: (query) =>
      activeSyncHref ||
      (query.state.data && !TERMINAL_TASK_STATES.has(query.state.data.state))
        ? TASK_POLL_INTERVAL_MS
        : false,
  });
}
