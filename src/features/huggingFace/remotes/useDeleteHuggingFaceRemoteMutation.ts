import { useMutation } from "@tanstack/react-query";

import { deleteHuggingFaceRemote } from "../../../api/client/hugging_face/remotes";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { huggingFaceRemotesListRootKey } from "./queryKeys";

/** Delete is asynchronous (VERIFIED: 202 + task) - tracked like any other
 * Pulp mutation, invalidating the remotes list once it actually completes. */
export function useDeleteHuggingFaceRemoteMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href }: { href: string; name: string }) =>
      deleteHuggingFaceRemote(href),
    onSuccess: ({ task }, { href, name }) => {
      registerTask({
        href: task,
        label: `Delete remote "${name}"`,
        resourceHrefs: [href],
        action: "delete",
        invalidateKeys: [huggingFaceRemotesListRootKey],
      });
    },
  });
}
