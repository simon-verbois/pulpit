import { apiPath, pulpFetch } from "../httpClient";

const BASE = apiPath("/rpm/prune/");

export interface PrunePackagesArgs {
  repo_hrefs: string[];
  keep_days: number;
  dry_run: boolean;
}

/** Return the task-group href so every child and dispatch completion are tracked. */
export async function pruneRpmPackages(
  args: PrunePackagesArgs,
): Promise<{ task: string }> {
  const { task_group: taskGroupHref } = await pulpFetch<{ task_group: string }>(BASE, {
    method: "POST",
    body: JSON.stringify(args),
  });
  return { task: taskGroupHref };
}
