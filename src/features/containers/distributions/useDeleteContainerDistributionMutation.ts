import { useMutation } from "@tanstack/react-query";

import { deleteContainerDistribution } from "../../../api/client/container/distributions";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { containerRepositoriesListRootKey } from "../repositories/queryKeys";
import { containerDistributionsListRootKey } from "./queryKeys";

/** VERIFIED live: deleting a container distribution also deletes the
 * repository it points at (a real pulp_container cascade, unlike RPM/
 * Ansible, where deleting a distribution never touches the repository) -
 * so this also invalidates the repositories list, not just distributions. */
export function useDeleteContainerDistributionMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href }: { href: string; name: string }) =>
      deleteContainerDistribution(href),
    onSuccess: ({ task }, { name }) => {
      registerTask({
        href: task,
        label: `Delete distribution "${name}"`,
        invalidateKeys: [
          containerDistributionsListRootKey,
          containerRepositoriesListRootKey,
        ],
      });
    },
  });
}
