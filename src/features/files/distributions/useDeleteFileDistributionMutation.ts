import { useMutation } from "@tanstack/react-query";

import { deleteFileDistribution } from "../../../api/client/file/distributions";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { fileDistributionsListRootKey } from "./queryKeys";

export function useDeleteFileDistributionMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href }: { href: string; name: string }) =>
      deleteFileDistribution(href),
    onSuccess: ({ task }, { name }) => {
      registerTask({
        href: task,
        label: `Delete distribution "${name}"`,
        invalidateKeys: [fileDistributionsListRootKey],
      });
    },
  });
}
