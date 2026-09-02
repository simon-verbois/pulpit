import { useMutation } from "@tanstack/react-query";

import { createRpmDistribution } from "../../../api/client/rpm/distributions";
import type { RpmDistributionCreate } from "../../../api/client/rpm/types";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { rpmDistributionsListRootKey } from "./queryKeys";

/** Create is asynchronous (VERIFIED: 202 + task), unlike repositories/remotes. */
export function useCreateRpmDistributionMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: (data: RpmDistributionCreate) => createRpmDistribution(data),
    onSuccess: ({ task }, { name }) => {
      registerTask({
        href: task,
        label: `Create distribution "${name}"`,
        invalidateKeys: [rpmDistributionsListRootKey],
      });
    },
  });
}
