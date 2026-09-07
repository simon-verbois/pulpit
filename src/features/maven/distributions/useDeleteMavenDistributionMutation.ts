import { useMutation } from "@tanstack/react-query";

import { deleteMavenDistribution } from "../../../api/client/maven/distributions";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { mavenDistributionsListRootKey } from "./queryKeys";

export function useDeleteMavenDistributionMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href }: { href: string; name: string }) =>
      deleteMavenDistribution(href),
    onSuccess: ({ task }, { name }) => {
      registerTask({
        href: task,
        label: `Delete distribution "${name}"`,
        invalidateKeys: [mavenDistributionsListRootKey],
      });
    },
  });
}
