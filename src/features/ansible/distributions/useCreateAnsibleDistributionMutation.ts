import { useMutation } from "@tanstack/react-query";

import { createAnsibleDistribution } from "../../../api/client/ansible/distributions";
import type { AnsibleDistributionCreate } from "../../../api/client/ansible/types";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { ansibleDistributionsListRootKey } from "./queryKeys";

/** Create is asynchronous (VERIFIED live: 202 + task), unlike repositories/remotes. */
export function useCreateAnsibleDistributionMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: (data: AnsibleDistributionCreate) => createAnsibleDistribution(data),
    onSuccess: ({ task }, { name }) => {
      registerTask({
        href: task,
        label: `Create distribution "${name}"`,
        invalidateKeys: [ansibleDistributionsListRootKey],
      });
    },
  });
}
