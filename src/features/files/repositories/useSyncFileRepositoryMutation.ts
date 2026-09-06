import { useMutation } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";

import { syncFileRepository } from "../../../api/client/file/repositories";
import { useTasksContext } from "../../../api/tasks/TasksContext";

interface SyncArgs {
  href: string;
  name: string;
  invalidateKeys: QueryKey[];
}

export function useSyncFileRepositoryMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href }: SyncArgs) => syncFileRepository(href),
    onSuccess: ({ task }, { name, invalidateKeys }) => {
      registerTask({
        href: task,
        label: `Sync repository "${name}"`,
        invalidateKeys,
      });
    },
  });
}
