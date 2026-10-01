import { useMutation } from "@tanstack/react-query";

import { deleteContainerRemote } from "../../../api/client/container/remotes";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { containerRemotesListRootKey } from "./queryKeys";

export function useDeleteContainerRemoteMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href }: { href: string; name: string }) => deleteContainerRemote(href),
    onSuccess: ({ task }, { href, name }) => {
      registerTask({
        href: task,
        label: `Delete remote "${name}"`,
        resourceHrefs: [href],
        action: "delete",
        invalidateKeys: [containerRemotesListRootKey],
      });
    },
  });
}
