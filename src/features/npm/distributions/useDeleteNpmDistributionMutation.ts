import { useMutation } from "@tanstack/react-query";

import { deleteNpmDistribution } from "../../../api/client/npm/distributions";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { npmDistributionsListRootKey } from "./queryKeys";

export function useDeleteNpmDistributionMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href }: { href: string; name: string }) => deleteNpmDistribution(href),
    onSuccess: ({ task }, { name }) => {
      registerTask({
        href: task,
        label: `Delete distribution "${name}"`,
        invalidateKeys: [npmDistributionsListRootKey],
      });
    },
  });
}
