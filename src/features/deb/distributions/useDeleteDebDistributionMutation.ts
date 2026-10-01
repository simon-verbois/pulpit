import { useMutation } from "@tanstack/react-query";

import { deleteDebDistribution } from "../../../api/client/deb/distributions";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { debDistributionsListRootKey } from "./queryKeys";

export function useDeleteDebDistributionMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href }: { href: string; name: string }) => deleteDebDistribution(href),
    onSuccess: ({ task }, { href, name }) => {
      registerTask({
        href: task,
        label: `Delete distribution "${name}"`,
        resourceHrefs: [href],
        action: "delete",
        invalidateKeys: [debDistributionsListRootKey],
      });
    },
  });
}
