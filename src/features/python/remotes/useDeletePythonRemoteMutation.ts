import { useMutation } from "@tanstack/react-query";

import { deletePythonRemote } from "../../../api/client/python/remotes";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { pythonRemotesListRootKey } from "./queryKeys";

/** Delete is asynchronous (VERIFIED: 202 + task) - tracked like any other
 * Pulp mutation, invalidating the remotes list once it actually completes. */
export function useDeletePythonRemoteMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href }: { href: string; name: string }) => deletePythonRemote(href),
    onSuccess: ({ task }, { href, name }) => {
      registerTask({
        href: task,
        label: `Delete remote "${name}"`,
        resourceHrefs: [href],
        action: "delete",
        invalidateKeys: [pythonRemotesListRootKey],
      });
    },
  });
}
