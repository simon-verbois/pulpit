import { useMutation } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";

import { uploadRpmPackage } from "../../../api/client/rpm/packages";
import { modifyRpmRepository } from "../../../api/client/rpm/repositories";
import { useTasksContext } from "../../../api/tasks/TasksContext";

interface UploadToRepositoryArgs {
  file: File;
  repositoryHref: string;
  repositoryName: string;
  invalidateKeys: QueryKey[];
}

/**
 * Two-step flow (VERIFIED against the live schema - see the pulp-api skill
 * notes in src/api/client/rpm/packages.ts): the upload endpoint only
 * creates the content unit (sync, 201); adding it to a repository is a
 * separate, asynchronous `modify` call.
 */
export function useUploadRpmPackageMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: async ({ file, repositoryHref }: UploadToRepositoryArgs) => {
      const pkg = await uploadRpmPackage(file);
      return modifyRpmRepository(repositoryHref, { add_content_units: [pkg.pulp_href] });
    },
    onSuccess: ({ task }, { file, repositoryName, invalidateKeys }) => {
      registerTask({
        href: task,
        label: `Add "${file.name}" to "${repositoryName}"`,
        invalidateKeys,
      });
    },
  });
}
