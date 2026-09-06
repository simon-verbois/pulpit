import { useMutation } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";

import { uploadGemContent } from "../../../api/client/gem/content";
import { modifyGemRepository } from "../../../api/client/gem/repositories";
import { useTasksContext } from "../../../api/tasks/TasksContext";

interface UploadToRepositoryArgs {
  file: File;
  repositoryHref: string;
  repositoryName: string;
  invalidateKeys: QueryKey[];
}

/**
 * Two-step flow, same as every other plugin's upload in this app: the
 * upload endpoint only creates the content unit (sync, 201); adding it to
 * a repository is a separate, asynchronous `modify` call.
 */
export function useUploadGemContentMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: async ({ file, repositoryHref }: UploadToRepositoryArgs) => {
      const content = await uploadGemContent(file);
      return modifyGemRepository(repositoryHref, {
        add_content_units: [content.pulp_href],
      });
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
