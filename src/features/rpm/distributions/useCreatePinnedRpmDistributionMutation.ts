import { useMutation } from "@tanstack/react-query";

import { createRpmDistribution } from "../../../api/client/rpm/distributions";
import { createRpmPublication } from "../../../api/client/rpm/publications";
import type { RpmDistributionCreate } from "../../../api/client/rpm/types";
import { PulpApiError } from "../../../api/errors/PulpApiError";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { waitForTask } from "../../../api/tasks/waitForTask";
import { rpmDistributionsListRootKey } from "./queryKeys";

interface CreatePinnedDistributionArgs {
  repositoryHref: string;
  repositoryName: string;
  repositoryVersionHref: string;
  distribution: Omit<RpmDistributionCreate, "repository" | "publication">;
}

export function useCreatePinnedRpmDistributionMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: async ({
      repositoryHref,
      repositoryName,
      repositoryVersionHref,
      distribution,
    }: CreatePinnedDistributionArgs) => {
      const { task: publicationTaskHref } = await createRpmPublication({
        repository_version: repositoryVersionHref,
      });
      registerTask({
        href: publicationTaskHref,
        label: `Publish a version of repository "${repositoryName}"`,
        resourceHrefs: [repositoryHref],
        action: "publish-version",
      });

      const publicationTask = await waitForTask(publicationTaskHref);
      const publicationHref = publicationTask.created_resources?.find((href) =>
        href.includes("/publications/rpm/rpm/"),
      );
      if (!publicationHref) {
        throw new PulpApiError(
          "unknown",
          "Pulp completed the publication task without returning the new publication.",
          { detail: publicationTask },
        );
      }

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
      return result;
    },
  });
}
