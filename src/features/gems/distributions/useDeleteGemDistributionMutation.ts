import { useMutation } from "@tanstack/react-query";

import { deleteGemDistribution } from "../../../api/client/gem/distributions";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { gemDistributionsListRootKey } from "./queryKeys";

export function useDeleteGemDistributionMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href }: { href: string; name: string }) => deleteGemDistribution(href),
    onSuccess: ({ task }, { href, name }) => {
      registerTask({
        href: task,
        label: `Delete distribution "${name}"`,
        resourceHrefs: [href],
        action: "delete",
        invalidateKeys: [gemDistributionsListRootKey],
      });
    },
  });
}
