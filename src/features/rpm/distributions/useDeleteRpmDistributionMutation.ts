import { useMutation } from "@tanstack/react-query";

import { deleteRpmDistribution } from "../../../api/client/rpm/distributions";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { rpmDistributionsListRootKey } from "./queryKeys";

export function useDeleteRpmDistributionMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href }: { href: string; name: string }) => deleteRpmDistribution(href),
    onSuccess: ({ task }, { href, name }) => {
      registerTask({
        href: task,
        label: `Delete distribution "${name}"`,
        resourceHrefs: [href],
        action: "delete",
        invalidateKeys: [rpmDistributionsListRootKey],
      });
    },
  });
}
