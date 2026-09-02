import { useMutation } from "@tanstack/react-query";

import { deleteAnsibleDistribution } from "../../../api/client/ansible/distributions";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { ansibleDistributionsListRootKey } from "./queryKeys";

export function useDeleteAnsibleDistributionMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href }: { href: string; name: string }) =>
      deleteAnsibleDistribution(href),
    onSuccess: ({ task }, { name }) => {
      registerTask({
        href: task,
        label: `Delete distribution "${name}"`,
        invalidateKeys: [ansibleDistributionsListRootKey],
      });
    },
  });
}
