import { useMutation } from "@tanstack/react-query";

import { deleteFileRepository } from "../../../api/client/file/repositories";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { fileRepositoriesListRootKey } from "./queryKeys";

export function useDeleteFileRepositoryMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href }: { href: string; name: string }) => deleteFileRepository(href),
    onSuccess: ({ task }, { href, name }) => {
      registerTask({
        href: task,
        label: `Delete repository "${name}"`,
        resourceHrefs: [href],
        action: "delete",
        invalidateKeys: [fileRepositoriesListRootKey],
      });
    },
  });
}
