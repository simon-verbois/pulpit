import { useMutation } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";

import { uploadComps } from "../../../api/client/rpm/compsContent";
import { useTasksContext } from "../../../api/tasks/TasksContext";

interface UploadCompsArgs {
  file: File;
  repositoryHref: string;
  repositoryName: string;
  invalidateKeys: QueryKey[];
}

export function useUploadCompsMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ file, repositoryHref }: UploadCompsArgs) =>
      uploadComps(file, repositoryHref),
    onSuccess: ({ task }, { file, repositoryName, invalidateKeys }) => {
      registerTask({
        href: task,
        label: `Add "${file.name}" to "${repositoryName}"`,
        invalidateKeys,
      });
    },
  });
}
