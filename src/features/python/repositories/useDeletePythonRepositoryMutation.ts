import { useMutation } from "@tanstack/react-query";

import { deletePythonRepository } from "../../../api/client/python/repositories";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { pythonRepositoriesListRootKey } from "./queryKeys";

export function useDeletePythonRepositoryMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href }: { href: string; name: string }) =>
      deletePythonRepository(href),
    onSuccess: ({ task }, { name }) => {
      registerTask({
        href: task,
        label: `Delete repository "${name}"`,
        invalidateKeys: [pythonRepositoriesListRootKey],
      });
    },
  });
}
