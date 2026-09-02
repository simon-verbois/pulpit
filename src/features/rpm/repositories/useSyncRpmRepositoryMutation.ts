import { useMutation } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";

import { syncRpmRepository } from "../../../api/client/rpm/repositories";
import { useTasksContext } from "../../../api/tasks/TasksContext";

interface SyncArgs {
  href: string;
  name: string;
  invalidateKeys: QueryKey[];
}

export function useSyncRpmRepositoryMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href }: SyncArgs) => syncRpmRepository(href),
    onSuccess: ({ task }, { name, invalidateKeys }) => {
      registerTask({
        href: task,
        label: `Sync repository "${name}"`,
        invalidateKeys,
      });
    },
  });
}
