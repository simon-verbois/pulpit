import { useMutation } from "@tanstack/react-query";

import { deleteGemRemote } from "../../../api/client/gem/remotes";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { gemRemotesListRootKey } from "./queryKeys";

/** Delete is asynchronous (VERIFIED: 202 + task) - tracked like any other
 * Pulp mutation, invalidating the remotes list once it actually completes. */
export function useDeleteGemRemoteMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href }: { href: string; name: string }) => deleteGemRemote(href),
    onSuccess: ({ task }, { name }) => {
      registerTask({
        href: task,
        label: `Delete remote "${name}"`,
        invalidateKeys: [gemRemotesListRootKey],
      });
    },
  });
}
