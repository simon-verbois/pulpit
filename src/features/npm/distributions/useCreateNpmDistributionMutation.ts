import { useMutation } from "@tanstack/react-query";

import { createNpmDistribution } from "../../../api/client/npm/distributions";
import type { NpmDistributionCreate } from "../../../api/client/npm/types";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { npmDistributionsListRootKey } from "./queryKeys";

/** Create is asynchronous (VERIFIED: 202 + task), unlike repositories/remotes. */
export function useCreateNpmDistributionMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: (data: NpmDistributionCreate) => createNpmDistribution(data),
    onSuccess: ({ task }, { name }) => {
      registerTask({
        href: task,
        label: `Create distribution "${name}"`,
        invalidateKeys: [npmDistributionsListRootKey],
      });
    },
  });
}
