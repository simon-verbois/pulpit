import { useMutation } from "@tanstack/react-query";

import { createContainerDistribution } from "../../../api/client/container/distributions";
import type { ContainerDistributionCreate } from "../../../api/client/container/types";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { containerDistributionsListRootKey } from "./queryKeys";

/** Create is asynchronous (VERIFIED live: 202 + task), unlike
 * repositories/remotes. */
export function useCreateContainerDistributionMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: (data: ContainerDistributionCreate) => createContainerDistribution(data),
    onSuccess: ({ task }, { name }) => {
      registerTask({
        href: task,
        label: `Create distribution "${name}"`,
        invalidateKeys: [containerDistributionsListRootKey],
      });
    },
  });
}
