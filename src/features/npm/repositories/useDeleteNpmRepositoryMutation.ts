import { useMutation } from "@tanstack/react-query";

import { deleteNpmRepository } from "../../../api/client/npm/repositories";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { npmRepositoriesListRootKey } from "./queryKeys";

export function useDeleteNpmRepositoryMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href }: { href: string; name: string }) => deleteNpmRepository(href),
    onSuccess: ({ task }, { href, name }) => {
      registerTask({
        href: task,
        label: `Delete repository "${name}"`,
        resourceHrefs: [href],
        action: "delete",
        invalidateKeys: [npmRepositoriesListRootKey],
      });
    },
  });
}
