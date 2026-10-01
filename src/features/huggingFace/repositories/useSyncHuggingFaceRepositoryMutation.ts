import { useMutation } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";

import { syncHuggingFaceRepository } from "../../../api/client/hugging_face/repositories";
import { useTasksContext } from "../../../api/tasks/TasksContext";

interface SyncArgs {
  href: string;
  name: string;
  invalidateKeys: QueryKey[];
}

export function useSyncHuggingFaceRepositoryMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href }: SyncArgs) => syncHuggingFaceRepository(href),
    onSuccess: ({ task }, { href, name, invalidateKeys }) => {
      registerTask({
        href: task,
        label: `Sync repository "${name}"`,
        resourceHrefs: [href],
        action: "sync",
        invalidateKeys,
      });
    },
  });
}
