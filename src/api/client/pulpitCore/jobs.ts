import { buildQuery } from "../queryString";
import { coreFetch, corePath } from "./httpClient";
import type { Job, JobPage, JobStatus } from "./types";

/** Generic pulpit-core job polling - the analogue of src/api/tasks/ for
 * Pulp tasks, but for jobs any pulpit-core module enqueues (task section 12). */
export function getJob(id: string): Promise<Job> {
  return coreFetch<Job>(corePath(`/jobs/${id}`));
}

export interface ListJobsParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  status?: JobStatus;
}

/** Job history, newest first - staff see every job, anyone else only their
 * own; periodic heartbeat jobs are left out (pulpit-core app/core/jobs/routes.py). */
export function listJobs(params: ListJobsParams): Promise<JobPage> {
  return coreFetch<JobPage>(`${corePath("/jobs")}${buildQuery(params)}`);
}
