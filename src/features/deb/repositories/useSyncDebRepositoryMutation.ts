import { useMutation } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";

import { syncDebRepository } from "../../../api/client/deb/repositories";
import { useTasksContext } from "../../../api/tasks/TasksContext";

interface SyncArgs {
  href: string;
  name: string;
  invalidateKeys: QueryKey[];
}

export function useSyncDebRepositoryMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href }: SyncArgs) => syncDebRepository(href),
    onSuccess: ({ task }, { name, invalidateKeys }) => {
      registerTask({
        href: task,
        label: `Sync repository "${name}"`,
        invalidateKeys,
      });
    },
  });
}
