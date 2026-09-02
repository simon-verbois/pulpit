import { useMutation } from "@tanstack/react-query";

import { deleteRpmRepository } from "../../../api/client/rpm/repositories";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { rpmRepositoriesListRootKey } from "./queryKeys";

export function useDeleteRpmRepositoryMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href }: { href: string; name: string }) => deleteRpmRepository(href),
    onSuccess: ({ task }, { name }) => {
      registerTask({
        href: task,
        label: `Delete repository "${name}"`,
        invalidateKeys: [rpmRepositoriesListRootKey],
      });
    },
  });
}
