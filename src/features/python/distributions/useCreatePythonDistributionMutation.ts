import { useMutation } from "@tanstack/react-query";

import { createPythonDistribution } from "../../../api/client/python/distributions";
import type { PythonDistributionCreate } from "../../../api/client/python/types";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { pythonDistributionsListRootKey } from "./queryKeys";

/** Create is asynchronous (VERIFIED: 202 + task), unlike repositories/remotes. */
export function useCreatePythonDistributionMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: (data: PythonDistributionCreate) => createPythonDistribution(data),
    onSuccess: ({ task }, { name }) => {
      registerTask({
        href: task,
        label: `Create distribution "${name}"`,
        invalidateKeys: [pythonDistributionsListRootKey],
      });
    },
  });
}
