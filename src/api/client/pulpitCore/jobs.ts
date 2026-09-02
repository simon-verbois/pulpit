import { coreFetch, corePath } from "./httpClient";
import type { Job } from "./types";

/** Generic pulpit-core job polling - the analogue of src/api/tasks/ for
 * Pulp tasks, but for jobs any pulpit-core module enqueues (task section 12). */
export function getJob(id: string): Promise<Job> {
  return coreFetch<Job>(corePath(`/jobs/${id}`));
}
