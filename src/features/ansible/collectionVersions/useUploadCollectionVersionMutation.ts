import { useMutation } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";

import { uploadCollectionVersion } from "../../../api/client/ansible/collectionVersions";
import { useTasksContext } from "../../../api/tasks/TasksContext";

interface UploadArgs {
  file: File;
  repositoryHref: string;
  repositoryName: string;
  invalidateKeys: QueryKey[];
}

/** One-step upload (VERIFIED live schema: `repository` is accepted directly
 * on the content endpoint, unlike RPM packages) - but still asynchronous
 * (202 + task), unlike RPM packages' synchronous upload. */
export function useUploadCollectionVersionMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ file, repositoryHref }: UploadArgs) =>
      uploadCollectionVersion(file, repositoryHref),
    onSuccess: ({ task }, { file, repositoryName, invalidateKeys }) => {
      registerTask({
        href: task,
        label: `Upload "${file.name}" to "${repositoryName}"`,
        invalidateKeys,
      });
    },
  });
}
