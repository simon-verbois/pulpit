import { useMutation } from "@tanstack/react-query";

import { deleteContainerRepository } from "../../../api/client/container/repositories";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { containerRepositoriesListRootKey } from "./queryKeys";

export function useDeleteContainerRepositoryMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href }: { href: string; name: string }) =>
      deleteContainerRepository(href),
    onSuccess: ({ task }, { href, name }) => {
      registerTask({
        href: task,
        label: `Delete repository "${name}"`,
        resourceHrefs: [href],
        action: "delete",
        invalidateKeys: [containerRepositoriesListRootKey],
      });
    },
  });
}
