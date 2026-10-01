import { useMutation } from "@tanstack/react-query";

import { deleteFileRemote } from "../../../api/client/file/remotes";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { fileRemotesListRootKey } from "./queryKeys";

/** Delete is asynchronous (VERIFIED: 202 + task) - tracked like any other
 * Pulp mutation, invalidating the remotes list once it actually completes. */
export function useDeleteFileRemoteMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href }: { href: string; name: string }) => deleteFileRemote(href),
    onSuccess: ({ task }, { href, name }) => {
      registerTask({
        href: task,
        label: `Delete remote "${name}"`,
        resourceHrefs: [href],
        action: "delete",
        invalidateKeys: [fileRemotesListRootKey],
      });
    },
  });
}
