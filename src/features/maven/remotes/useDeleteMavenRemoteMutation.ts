import { useMutation } from "@tanstack/react-query";

import { deleteMavenRemote } from "../../../api/client/maven/remotes";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { mavenRemotesListRootKey } from "./queryKeys";

/** Delete is asynchronous (VERIFIED: 202 + task) - tracked like any other
 * Pulp mutation, invalidating the remotes list once it actually completes. */
export function useDeleteMavenRemoteMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href }: { href: string; name: string }) => deleteMavenRemote(href),
    onSuccess: ({ task }, { href, name }) => {
      registerTask({
        href: task,
        label: `Delete remote "${name}"`,
        resourceHrefs: [href],
        action: "delete",
        invalidateKeys: [mavenRemotesListRootKey],
      });
    },
  });
}
