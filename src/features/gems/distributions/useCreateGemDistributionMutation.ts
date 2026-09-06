import { useMutation } from "@tanstack/react-query";

import { createGemDistribution } from "../../../api/client/gem/distributions";
import type { GemDistributionCreate } from "../../../api/client/gem/types";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { gemDistributionsListRootKey } from "./queryKeys";

/** Create is asynchronous (VERIFIED: 202 + task), unlike repositories/remotes. */
export function useCreateGemDistributionMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: (data: GemDistributionCreate) => createGemDistribution(data),
    onSuccess: ({ task }, { name }) => {
      registerTask({
        href: task,
        label: `Create distribution "${name}"`,
        invalidateKeys: [gemDistributionsListRootKey],
      });
    },
  });
}
