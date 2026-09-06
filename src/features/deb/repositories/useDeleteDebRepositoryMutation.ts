import { useMutation } from "@tanstack/react-query";

import { deleteDebRepository } from "../../../api/client/deb/repositories";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { debRepositoriesListRootKey } from "./queryKeys";

export function useDeleteDebRepositoryMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href }: { href: string; name: string }) => deleteDebRepository(href),
    onSuccess: ({ task }, { name }) => {
      registerTask({
        href: task,
        label: `Delete repository "${name}"`,
        invalidateKeys: [debRepositoriesListRootKey],
      });
    },
  });
}
