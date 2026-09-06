import { useMutation } from "@tanstack/react-query";

import { createFileDistribution } from "../../../api/client/file/distributions";
import type { FileDistributionCreate } from "../../../api/client/file/types";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { fileDistributionsListRootKey } from "./queryKeys";

/** Create is asynchronous (VERIFIED: 202 + task), unlike repositories/remotes. */
export function useCreateFileDistributionMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: (data: FileDistributionCreate) => createFileDistribution(data),
    onSuccess: ({ task }, { name }) => {
      registerTask({
        href: task,
        label: `Create distribution "${name}"`,
        invalidateKeys: [fileDistributionsListRootKey],
      });
    },
  });
}
