import { useMutation } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";

import { uploadMavenContent } from "../../../api/client/maven/content";
import { useTasksContext } from "../../../api/tasks/TasksContext";

interface UploadToRepositoryArgs {
  file: File;
  relativePath: string;
  repositoryHref: string;
  repositoryName: string;
  invalidateKeys: QueryKey[];
}

/**
 * A genuine one-shot upload-and-attach - VERIFIED live: unlike every other
 * plugin's upload in this app, this endpoint is itself asynchronous (202 +
 * task) and accepts the target `repository` directly, so there's no
 * separate `modify()` call needed (or even possible - the response here is
 * just a task, not the created content object).
 */
export function useUploadMavenContentMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ file, relativePath, repositoryHref }: UploadToRepositoryArgs) =>
      uploadMavenContent(file, relativePath, repositoryHref),
    onSuccess: ({ task }, { relativePath, repositoryName, invalidateKeys }) => {
      registerTask({
        href: task,
        label: `Add "${relativePath}" to "${repositoryName}"`,
        invalidateKeys,
      });
    },
  });
}
