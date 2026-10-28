import type { ListTasksParams } from "../../api/client/tasks";
import type { ListJobsParams } from "../../api/client/pulpitCore/jobs";

export const latestSyncTaskQueryKey = (
  repositoryHref: string,
  activeSyncHref: string | null,
) => ["pulp", "tasks", "latest-sync", repositoryHref, activeSyncHref] as const;

export const tasksHistoryQueryKey = (params: ListTasksParams) =>
  ["pulp", "tasks", "history", params] as const;

export const jobsHistoryQueryKey = (params: ListJobsParams) =>
  ["pulpit-core", "jobs", "history", params] as const;
