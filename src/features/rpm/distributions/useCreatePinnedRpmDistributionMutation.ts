import { useMutation } from "@tanstack/react-query";

import {
  createRpmDistribution,
  findRpmDistributionConflict,
} from "../../../api/client/rpm/distributions";
import { createRpmPublication } from "../../../api/client/rpm/publications";
import type { RpmDistributionCreate } from "../../../api/client/rpm/types";
import { PulpApiError } from "../../../api/errors/PulpApiError";
import { useTasksContext, type TrackedTask } from "../../../api/tasks/TasksContext";
import { waitForTask } from "../../../api/tasks/waitForTask";
import { rpmDistributionsListRootKey } from "./queryKeys";

interface CreatePinnedDistributionArgs {
  repositoryHref: string;
  repositoryName: string;
  repositoryVersionHref: string;
  distribution: Omit<RpmDistributionCreate, "repository" | "publication">;
}

/** Waits for the publication task, then points the new distribution at the
 * publication it created. Runs detached from the dialog: both tasks appear
 * in the Tasks drawer, which is where their progress and failures show. */
async function finishPinnedDistribution(
  publicationTaskHref: string,
  { repositoryHref, distribution }: CreatePinnedDistributionArgs,
  registerTask: (task: TrackedTask) => void,
) {
  const publicationTask = await waitForTask(publicationTaskHref);
  const publicationHref = publicationTask.created_resources?.find((href) =>
    href.includes("/publications/rpm/rpm/"),
  );
  if (!publicationHref) return;

  const result = await createRpmDistribution({
    ...distribution,
    publication: publicationHref,
  });
  registerTask({
    href: result.task,
    label: `Create pinned distribution "${distribution.name}"`,
    resourceHrefs: [repositoryHref],
    action: "create-pinned-distribution",
    invalidateKeys: [rpmDistributionsListRootKey],
  });
}

/** Resolves as soon as Pulp accepts the publication (202 + task), so the
 * dialog can close instead of waiting for a publication that can take
 * minutes on a large repository. */
export function useCreatePinnedRpmDistributionMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: async (args: CreatePinnedDistributionArgs) => {
      const { repositoryHref, repositoryName, repositoryVersionHref, distribution } =
        args;
      const conflict = await findRpmDistributionConflict(
        distribution.name,
        distribution.base_path,
      );
      if (conflict) throw new PulpApiError("validation", conflict);

      const { task } = await createRpmPublication({
        repository_version: repositoryVersionHref,
      });
      registerTask({
        href: task,
        label: `Publish a version of repository "${repositoryName}"`,
        resourceHrefs: [repositoryHref],
        action: "publish-version",
      });
      finishPinnedDistribution(task, args, registerTask).catch((error: unknown) => {
        console.error("Could not create the pinned distribution", error);
      });
      return { task };
    },
  });
}
