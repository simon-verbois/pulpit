import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { listJobs, type ListJobsParams } from "../../api/client/pulpitCore/jobs";
import { TASK_POLL_INTERVAL_MS } from "../../api/client/tasks";
import { TERMINAL_JOB_STATUSES } from "./jobLabel";
import { jobsHistoryQueryKey } from "./queryKeys";

export function useJobsQuery(params: ListJobsParams) {
  return useQuery({
    queryKey: jobsHistoryQueryKey(params),
    queryFn: () => listJobs(params),
    placeholderData: keepPreviousData,
    // Same as useTasksQuery: keep polling while anything listed is in flight.
    refetchInterval: (query) =>
      query.state.data?.results.some((job) => !TERMINAL_JOB_STATUSES.has(job.status))
        ? TASK_POLL_INTERVAL_MS
        : false,
  });
}
