import {
  getTask,
  TASK_POLL_INTERVAL_MS,
  TERMINAL_TASK_STATES,
  type PulpTask,
} from "../client/tasks";
import { PulpApiError } from "../errors/PulpApiError";

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

/**
 * Waits for a task whose completed resource is required by the next API call.
 * The task is still registered with TasksContext by the caller, so it remains
 * visible in the global task UI; this helper only provides sequencing.
 */
export async function waitForTask(taskHref: string): Promise<PulpTask> {
  while (true) {
    const task = await getTask(taskHref);
    if (!TERMINAL_TASK_STATES.has(task.state)) {
      await delay(TASK_POLL_INTERVAL_MS);
      continue;
    }
    if (task.state === "completed") return task;

    throw new PulpApiError(
      "unknown",
      task.error?.description ?? `The Pulp task was ${task.state}.`,
      { detail: task.error },
    );
  }
}
