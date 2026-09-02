import { apiPath, pulpFetch } from "../httpClient";
import { getTaskGroup } from "../tasks";

const BASE = apiPath("/rpm/prune/");

export interface PrunePackagesArgs {
  repo_hrefs: string[];
  keep_days: number;
  dry_run: boolean;
}

/**
 * Removes superseded package versions across the given repositories,
 * keeping only the last `keep_days` days' worth (VERIFIED live: `dry_run`
 * genuinely does nothing destructive - safe to default it on).
 *
 * VERIFIED live: like an ACS refresh, this returns `{task_group}`, not
 * `{task}` - resolved to its first task the same way (see acs.ts and
 * getTaskGroup).
 */
export async function pruneRpmPackages(
  args: PrunePackagesArgs,
): Promise<{ task: string }> {
  const { task_group: taskGroupHref } = await pulpFetch<{ task_group: string }>(BASE, {
    method: "POST",
    body: JSON.stringify(args),
  });
  const taskGroup = await getTaskGroup(taskGroupHref);
  const firstTask = taskGroup.tasks[0];
  if (!firstTask) {
    throw new Error("Prune started, but no task was found to track.");
  }
  return { task: firstTask.pulp_href };
}
