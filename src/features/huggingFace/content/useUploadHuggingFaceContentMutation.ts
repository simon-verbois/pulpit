import { useMutation } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";

import { uploadHuggingFaceContent } from "../../../api/client/hugging_face/content";
import { modifyHuggingFaceRepository } from "../../../api/client/hugging_face/repositories";
import { useTasksContext } from "../../../api/tasks/TasksContext";

interface UploadToRepositoryArgs {
  file: File;
  relativePath: string;
  repoId: string;
  repositoryHref: string;
  repositoryName: string;
  invalidateKeys: QueryKey[];
}

/**
 * Two-step flow, same as every other plugin's upload in this app: the
 * upload endpoint only creates the content unit (sync, 201); adding it to
 * a repository is a separate, asynchronous `modify` call.
 */
export function useUploadHuggingFaceContentMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: async ({
      file,
      relativePath,
      repoId,
      repositoryHref,
    }: UploadToRepositoryArgs) => {
      const content = await uploadHuggingFaceContent(file, relativePath, repoId);
      return modifyHuggingFaceRepository(repositoryHref, {
        add_content_units: [content.pulp_href],
      });
    },
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
