import type { ListTasksParams } from "../../api/client/tasks";

export const tasksHistoryQueryKey = (params: ListTasksParams) =>
  ["pulp", "tasks", "history", params] as const;
