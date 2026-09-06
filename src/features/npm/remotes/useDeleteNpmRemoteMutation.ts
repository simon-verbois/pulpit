import { useMutation } from "@tanstack/react-query";

import { deleteNpmRemote } from "../../../api/client/npm/remotes";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { npmRemotesListRootKey } from "./queryKeys";

/** Delete is asynchronous (VERIFIED: 202 + task) - tracked like any other
 * Pulp mutation, invalidating the remotes list once it actually completes. */
export function useDeleteNpmRemoteMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href }: { href: string; name: string }) => deleteNpmRemote(href),
    onSuccess: ({ task }, { name }) => {
      registerTask({
        href: task,
        label: `Delete remote "${name}"`,
        invalidateKeys: [npmRemotesListRootKey],
      });
    },
  });
}
