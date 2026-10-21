import { useMutation } from "@tanstack/react-query";

import { syncRepository } from "../../api/client/repositorySync";
import { useTasksContext } from "../../api/tasks/TasksContext";

interface RetrySyncArgs {
  repositoryHref: string;
  remoteHref: string;
  name: string;
}

export function useRetrySyncMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ repositoryHref, remoteHref }: RetrySyncArgs) =>
      syncRepository(repositoryHref, remoteHref),
    onSuccess: ({ task }, { repositoryHref, name }) => {
      registerTask({
        href: task,
        label: `Sync repository "${name}"`,
        resourceHrefs: [repositoryHref],
        action: "sync",
        // The plugin isn't known here, so refresh every Pulp query once the
        // sync completes rather than guess each plugin's repository keys.
        invalidateKeys: [["pulp"]],
      });
    },
  });
}
