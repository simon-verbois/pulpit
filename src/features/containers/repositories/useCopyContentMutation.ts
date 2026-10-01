import { useMutation } from "@tanstack/react-query";

import {
  copyContainerManifests,
  copyContainerTags,
} from "../../../api/client/container/repositories";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { containerRepositoriesListRootKey } from "./queryKeys";

interface CopyContentArgs {
  sourceRepositoryVersionHref: string;
  destRepositoryHref: string;
  destRepositoryName: string;
}

/**
 * Unlike RPM/Ansible's single "copy this whole version" endpoint,
 * pulp_container splits tags and manifests into two separate copy actions
 * (VERIFIED live schema) - this fires both (with no name/digest filters, so
 * "everything" from the source version) and tracks them as two tasks, the
 * closest equivalent to a whole-version copy.
 */
export function useCopyContentMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: async ({
      sourceRepositoryVersionHref,
      destRepositoryHref,
    }: CopyContentArgs) => {
      const [tags, manifests] = await Promise.all([
        copyContainerTags(destRepositoryHref, sourceRepositoryVersionHref),
        copyContainerManifests(destRepositoryHref, sourceRepositoryVersionHref),
      ]);
      return { tags, manifests };
    },
    onSuccess: ({ tags, manifests }, { destRepositoryHref, destRepositoryName }) => {
      registerTask({
        href: tags.task,
        label: `Copy tags to "${destRepositoryName}"`,
        resourceHrefs: [destRepositoryHref],
        action: "copy",
        invalidateKeys: [containerRepositoriesListRootKey],
      });
      registerTask({
        href: manifests.task,
        label: `Copy manifests to "${destRepositoryName}"`,
        resourceHrefs: [destRepositoryHref],
        action: "copy",
        invalidateKeys: [containerRepositoriesListRootKey],
      });
    },
  });
}
