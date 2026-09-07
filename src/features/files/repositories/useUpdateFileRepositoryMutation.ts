import { useMutation } from "@tanstack/react-query";

import { updateFileRepository } from "../../../api/client/file/repositories";
import type { FileRepositoryUpdate } from "../../../api/client/file/types";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { fileRepositoriesListRootKey, fileRepositoryByNameKey } from "./queryKeys";

interface UpdateArgs {
  href: string;
  name: string;
  data: FileRepositoryUpdate;
}

/** Update is asynchronous (VERIFIED: 202 + task), unlike create. */
export function useUpdateFileRepositoryMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href, data }: UpdateArgs) => updateFileRepository(href, data),
    onSuccess: ({ task }, { name, data }) => {
      registerTask({
        href: task,
        label: `Update repository "${data.name ?? name}"`,
        invalidateKeys: [
          fileRepositoryByNameKey(name),
          // The name itself may have just changed - also invalidate the new
          // one so the (renamed) repository is findable by its new slug.
          ...(data.name && data.name !== name
            ? [fileRepositoryByNameKey(data.name)]
            : []),
          fileRepositoriesListRootKey,
        ],
      });
    },
  });
}
