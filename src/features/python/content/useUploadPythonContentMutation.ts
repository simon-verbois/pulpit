import { useMutation } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";

import { uploadPythonContent } from "../../../api/client/python/content";
import { useTasksContext } from "../../../api/tasks/TasksContext";

interface UploadToRepositoryArgs {
  file: File;
  relativePath: string;
  repositoryHref: string;
  repositoryName: string;
  invalidateKeys: QueryKey[];
}

/**
 * A genuine one-shot upload-and-attach, like maven/npm - VERIFIED live:
 * unlike this app's other autopublish plugins (RPM/File), this endpoint is
 * itself asynchronous (202 + task) and accepts the target `repository`
 * directly, so there's no separate `modify()` call needed (or even
 * possible - the response here is just a task, not the created content
 * object).
 */
export function useUploadPythonContentMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ file, relativePath, repositoryHref }: UploadToRepositoryArgs) =>
      uploadPythonContent(file, relativePath, repositoryHref),
    onSuccess: ({ task }, { relativePath, repositoryName, invalidateKeys }) => {
      registerTask({
        href: task,
        label: `Add "${relativePath}" to "${repositoryName}"`,
        invalidateKeys,
      });
    },
  });
}
