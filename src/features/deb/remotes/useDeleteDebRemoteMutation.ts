import { useMutation } from "@tanstack/react-query";

import { deleteDebRemote } from "../../../api/client/deb/remotes";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { debRemotesListRootKey } from "./queryKeys";

/** Delete is asynchronous (VERIFIED: 202 + task) - tracked like any other
 * Pulp mutation, invalidating the remotes list once it actually completes. */
export function useDeleteDebRemoteMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href }: { href: string; name: string }) => deleteDebRemote(href),
    onSuccess: ({ task }, { name }) => {
      registerTask({
        href: task,
        label: `Delete remote "${name}"`,
        invalidateKeys: [debRemotesListRootKey],
      });
    },
  });
}
