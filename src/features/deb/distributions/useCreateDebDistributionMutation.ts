import { useMutation } from "@tanstack/react-query";

import { createDebDistribution } from "../../../api/client/deb/distributions";
import type { DebDistributionCreate } from "../../../api/client/deb/types";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { debDistributionsListRootKey } from "./queryKeys";

/** Create is asynchronous (VERIFIED: 202 + task), unlike repositories/remotes. */
export function useCreateDebDistributionMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: (data: DebDistributionCreate) => createDebDistribution(data),
    onSuccess: ({ task }, { name }) => {
      registerTask({
        href: task,
        label: `Create distribution "${name}"`,
        invalidateKeys: [debDistributionsListRootKey],
      });
    },
  });
}
