import { useMutation } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";

import { uploadRpmAdvisory } from "../../../api/client/rpm/advisories";
import { useTasksContext } from "../../../api/tasks/TasksContext";

interface UploadArgs {
  file: File;
  repositoryHref: string;
  repositoryName: string;
  invalidateKeys: QueryKey[];
}

/** One step (VERIFIED live) - unlike package upload, this adds the advisory
 * to the repository directly. */
export function useUploadRpmAdvisoryMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ file, repositoryHref }: UploadArgs) =>
      uploadRpmAdvisory(file, repositoryHref),
    onSuccess: ({ task }, { file, repositoryName, invalidateKeys }) => {
      registerTask({
        href: task,
        label: `Add "${file.name}" to "${repositoryName}"`,
        invalidateKeys,
      });
    },
  });
}
