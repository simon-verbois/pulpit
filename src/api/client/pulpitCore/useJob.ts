import { useQuery } from "@tanstack/react-query";

import { getJob } from "./jobs";

const TERMINAL_JOB_STATES = new Set(["success", "failed"]);

/** Polls a single pulpit-core job until it reaches a terminal state - the
 * pulpit-core analogue of src/api/tasks/useTask.ts for Pulp tasks. Never
 * fabricates progress; only reflects queued/running/success/failed. */
export function useJob(jobId: string | undefined) {
  return useQuery({
    queryKey: ["pulpit-core", "job", jobId],
    queryFn: () => getJob(jobId as string),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && TERMINAL_JOB_STATES.has(status) ? false : 1500;
    },
  });
}
