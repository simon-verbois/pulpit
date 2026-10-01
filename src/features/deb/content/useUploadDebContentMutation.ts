import { useMutation } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";

import { uploadDebContent } from "../../../api/client/deb/content";
import { useTasksContext } from "../../../api/tasks/TasksContext";

interface UploadToRepositoryArgs {
  file: File;
  relativePath: string;
  repositoryHref: string;
  repositoryName: string;
  invalidateKeys: QueryKey[];
}

/**
 * A genuine one-shot upload-and-attach, like maven/npm/python - VERIFIED
 * live: unlike this app's other autopublish plugins (RPM/File), this
 * endpoint is itself asynchronous (202 + task) and accepts the target
 * `repository` directly, so there's no separate `modify()` call needed (or
 * even possible - the response here is just a task, not the created
 * content object).
 */
export function useUploadDebContentMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ file, relativePath, repositoryHref }: UploadToRepositoryArgs) =>
      uploadDebContent(file, relativePath, repositoryHref),
    onSuccess: (
      { task },
      { relativePath, repositoryHref, repositoryName, invalidateKeys },
    ) => {
      registerTask({
        href: task,
        label: `Add "${relativePath}" to "${repositoryName}"`,
        resourceHrefs: [repositoryHref],
        action: "upload",
        invalidateKeys,
      });
    },
  });
}
