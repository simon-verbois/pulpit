import { useMutation } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";

import { syncPythonRepository } from "../../../api/client/python/repositories";
import { useTasksContext } from "../../../api/tasks/TasksContext";

interface SyncArgs {
  href: string;
  name: string;
  invalidateKeys: QueryKey[];
}

export function useSyncPythonRepositoryMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href }: SyncArgs) => syncPythonRepository(href),
    onSuccess: ({ task }, { name, invalidateKeys }) => {
      registerTask({
        href: task,
        label: `Sync repository "${name}"`,
        invalidateKeys,
      });
    },
  });
}
