import { useMutation } from "@tanstack/react-query";

import { deleteRpmRemote } from "../../../api/client/rpm/remotes";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { rpmRemotesListRootKey } from "./queryKeys";

/** Delete is asynchronous (VERIFIED: 202 + task) - tracked like any other
 * Pulp mutation, invalidating the remotes list once it actually completes. */
export function useDeleteRpmRemoteMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href }: { href: string; name: string }) => deleteRpmRemote(href),
    onSuccess: ({ task }, { href, name }) => {
      registerTask({
        href: task,
        label: `Delete remote "${name}"`,
        resourceHrefs: [href],
        action: "delete",
        invalidateKeys: [rpmRemotesListRootKey],
      });
    },
  });
}
