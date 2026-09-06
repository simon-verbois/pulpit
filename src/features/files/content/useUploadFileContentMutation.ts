import { useMutation } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";

import { uploadFileContent } from "../../../api/client/file/content";
import { modifyFileRepository } from "../../../api/client/file/repositories";
import { useTasksContext } from "../../../api/tasks/TasksContext";

interface UploadToRepositoryArgs {
  file: File;
  relativePath: string;
  repositoryHref: string;
  repositoryName: string;
  invalidateKeys: QueryKey[];
}

/**
 * Two-step flow, same as every other plugin's upload in this app: the
 * upload endpoint only creates the content unit (sync, 201); adding it to
 * a repository is a separate, asynchronous `modify` call.
 */
export function useUploadFileContentMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: async ({ file, relativePath, repositoryHref }: UploadToRepositoryArgs) => {
      const content = await uploadFileContent(file, relativePath);
      return modifyFileRepository(repositoryHref, {
        add_content_units: [content.pulp_href],
      });
    },
    onSuccess: ({ task }, { relativePath, repositoryName, invalidateKeys }) => {
      registerTask({
        href: task,
        label: `Add "${relativePath}" to "${repositoryName}"`,
        invalidateKeys,
      });
    },
  });
}
