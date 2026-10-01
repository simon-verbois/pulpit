import { useMutation } from "@tanstack/react-query";

import { deleteGemRepository } from "../../../api/client/gem/repositories";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { gemRepositoriesListRootKey } from "./queryKeys";

export function useDeleteGemRepositoryMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href }: { href: string; name: string }) => deleteGemRepository(href),
    onSuccess: ({ task }, { href, name }) => {
      registerTask({
        href: task,
        label: `Delete repository "${name}"`,
        resourceHrefs: [href],
        action: "delete",
        invalidateKeys: [gemRepositoriesListRootKey],
      });
    },
  });
}
