import { coreFetch, corePath } from "./httpClient";
import type { Job, TaskRetentionSettings, TaskRetentionSettingsUpdate } from "./types";

const BASE = corePath("/task_retention");

/** Staff-only (pulpit-core returns 403 otherwise): purging deletes audit history. */
export function getTaskRetentionSettings(): Promise<TaskRetentionSettings> {
  return coreFetch<TaskRetentionSettings>(`${BASE}/settings`);
}

export function updateTaskRetentionSettings(
  changes: TaskRetentionSettingsUpdate,
): Promise<TaskRetentionSettings> {
  return coreFetch<TaskRetentionSettings>(`${BASE}/settings`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
}

/** Queues a purge with the saved retention, even when the automatic purge is off. */
export function purgeTaskHistoryNow(): Promise<Job> {
  return coreFetch<Job>(`${BASE}/purge`, { method: "POST" });
}
