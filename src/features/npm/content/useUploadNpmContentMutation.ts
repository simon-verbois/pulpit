import { useMutation } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";

import { uploadNpmContent } from "../../../api/client/npm/content";
import { useTasksContext } from "../../../api/tasks/TasksContext";

interface UploadToRepositoryArgs {
  file: File;
  relativePath: string;
  repositoryHref: string;
  repositoryName: string;
  invalidateKeys: QueryKey[];
}

/**
 * A genuine one-shot upload-and-attach, like maven - VERIFIED live: unlike
 * gem/hugging_face's upload in this app, this endpoint is itself
 * asynchronous (202 + task) and accepts the target `repository` directly,
 * so there's no separate `modify()` call needed (or even possible - the
 * response here is just a task, not the created content object).
 */
export function useUploadNpmContentMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ file, relativePath, repositoryHref }: UploadToRepositoryArgs) =>
      uploadNpmContent(file, relativePath, repositoryHref),
    onSuccess: ({ task }, { relativePath, repositoryName, invalidateKeys }) => {
      registerTask({
        href: task,
        label: `Add "${relativePath}" to "${repositoryName}"`,
        invalidateKeys,
      });
    },
  });
}
