import { useMutation } from "@tanstack/react-query";

import { deletePythonDistribution } from "../../../api/client/python/distributions";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { pythonDistributionsListRootKey } from "./queryKeys";

export function useDeletePythonDistributionMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href }: { href: string; name: string }) =>
      deletePythonDistribution(href),
    onSuccess: ({ task }, { href, name }) => {
      registerTask({
        href: task,
        label: `Delete distribution "${name}"`,
        resourceHrefs: [href],
        action: "delete",
        invalidateKeys: [pythonDistributionsListRootKey],
      });
    },
  });
}
