import { useMutation } from "@tanstack/react-query";

import { createMavenDistribution } from "../../../api/client/maven/distributions";
import type { MavenDistributionCreate } from "../../../api/client/maven/types";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { mavenDistributionsListRootKey } from "./queryKeys";

/** Create is asynchronous (VERIFIED: 202 + task), unlike repositories/remotes. */
export function useCreateMavenDistributionMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: (data: MavenDistributionCreate) => createMavenDistribution(data),
    onSuccess: ({ task }, { name }) => {
      registerTask({
        href: task,
        label: `Create distribution "${name}"`,
        invalidateKeys: [mavenDistributionsListRootKey],
      });
    },
  });
}
