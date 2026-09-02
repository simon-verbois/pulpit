import { useMutation } from "@tanstack/react-query";

import { deleteAnsibleRepository } from "../../../api/client/ansible/repositories";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { ansibleRepositoriesListRootKey } from "./queryKeys";

export function useDeleteAnsibleRepositoryMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href }: { href: string; name: string }) =>
      deleteAnsibleRepository(href),
    onSuccess: ({ task }, { name }) => {
      registerTask({
        href: task,
        label: `Delete repository "${name}"`,
        invalidateKeys: [ansibleRepositoriesListRootKey],
      });
    },
  });
}
