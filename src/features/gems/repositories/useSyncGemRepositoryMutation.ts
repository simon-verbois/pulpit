import { useMutation } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";

import { syncGemRepository } from "../../../api/client/gem/repositories";
import { useTasksContext } from "../../../api/tasks/TasksContext";

interface SyncArgs {
  href: string;
  name: string;
  invalidateKeys: QueryKey[];
}

export function useSyncGemRepositoryMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href }: SyncArgs) => syncGemRepository(href),
    onSuccess: ({ task }, { name, invalidateKeys }) => {
      registerTask({
        href: task,
        label: `Sync repository "${name}"`,
        invalidateKeys,
      });
    },
  });
}
