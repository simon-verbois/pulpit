import { apiPath, pulpFetch } from "./httpClient";
import { buildQuery } from "./queryString";

// VERIFIED against the live TaskResponse schema (pulpcore 3.116.0): state
// enum, timestamp fields, and the fact that `error` has no fixed shape
// ("A JSON Object of a fatal error...") - see the pulp-tasks skill.
export type PulpTaskState =
  "waiting" | "skipped" | "running" | "completed" | "failed" | "canceled" | "canceling";

export const TERMINAL_TASK_STATES: ReadonlySet<PulpTaskState> = new Set([
  "completed",
  "failed",
  "canceled",
  "skipped",
]);

/** How often a non-terminal task is re-polled (useTask.ts, TasksIndicator.tsx -
 * up to one such poll per tracked task, MAX_TRACKED_TASKS at once). Kept a
 * few seconds rather than sub-2s: still feels responsive for a human
 * watching a task's status, but meaningfully cuts round-trips over a slow/
 * high-latency connection (e.g. a remote-desktop/bastion session) when
 * several tasks are tracked at once. */
export const TASK_POLL_INTERVAL_MS = 3000;

export interface PulpTask {
  pulp_href: string;
  name?: string;
  state: PulpTaskState;
  pulp_created?: string;
  started_at?: string | null;
  finished_at?: string | null;
  // Shape isn't fixed by the schema; `description` is what pulpcore's own
  // tasks actually populate, but never assume it's present.
  error?: { description?: string } | null;
  // The rest VERIFIED live against a real /pulp/api/v3/tasks/ response -
  // every mutation across the whole app ultimately lands in this same
  // persistent, Pulp-owned task record, which is the audit trail Pulpit
  // exposes on the Tasks page (docs/ROADMAP.md "Improved auditability").
  logging_cid?: string;
  /** Href of the user who triggered this task, or null for system-initiated ones. */
  created_by?: string | null;
  reserved_resources_record?: string[];
  created_resources?: string[];
  /** Per-stage counters the task itself reports as it runs (VERIFIED live:
   * rpm sync reports "Parsed Packages", "Downloading Artifacts"...; publish
   * and signing report "Generating repository metadata"). `total` is null
   * for open-ended counters such as downloads. */
  progress_reports?: PulpProgressReport[];
}

export interface PulpProgressReport {
  message?: string;
  code?: string;
  state?: string;
  total?: number | null;
  done?: number;
  suffix?: string | null;
}

export interface PulpPage<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** `href` is the full task href Pulp returned, e.g. "/pulp/api/v3/tasks/<id>/". */
export function getTask(href: string): Promise<PulpTask> {
  return pulpFetch<PulpTask>(href);
}

/**
 * Request cancellation of a waiting/running task. VERIFIED against the live
 * pulpcore 3.116.1 OpenAPI schema: PATCH the task's own href with the desired
 * state, returning the updated task synchronously (200; 409 if cancellation
 * conflicts with its current state).
 */
export function cancelTask(href: string): Promise<PulpTask> {
  return pulpFetch<PulpTask>(href, {
    method: "PATCH",
    body: JSON.stringify({ state: "canceled" }),
  });
}

/** The task's UUID, the last segment of its href - what `/tasks?task=<id>` carries. */
export function taskIdFromHref(href: string): string {
  return href.split("/").filter(Boolean).pop() ?? href;
}

export interface ListTasksParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  state?: PulpTaskState;
  name__contains?: string;
  ordering?: string;
}

/** The full persistent task history Pulp itself keeps - distinct from the
 * in-session `TasksContext` tracking used by the masthead drawer, which
 * only ever knows about tasks triggered in the current browser tab. */
export function listTasks(params: ListTasksParams): Promise<PulpPage<PulpTask>> {
  return pulpFetch<PulpPage<PulpTask>>(
    `${apiPath("/tasks/")}${buildQuery({ ordering: "-pulp_created", ...params })}`,
  );
}

/** Some operations (e.g. an Alternate Content Source refresh) dispatch a
 * *group* of tasks and return `{task_group: <href>}` instead of a single
 * `{task: <href>}` (VERIFIED live). Pulpit's task-tracking UI only tracks
 * individual tasks, so callers resolve a task group to its first task href
 * via this and track that - accurate for the common case of one task per
 * group (e.g. a default-paths ACS refresh), not a general task-group UI. */
export interface PulpTaskGroup {
  pulp_href: string;
  tasks: { pulp_href: string }[];
}

export function getTaskGroup(href: string): Promise<PulpTaskGroup> {
  return pulpFetch<PulpTaskGroup>(href);
}
