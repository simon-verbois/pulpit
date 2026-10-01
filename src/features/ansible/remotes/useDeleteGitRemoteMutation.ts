import { useMutation } from "@tanstack/react-query";

import { deleteGitRemote } from "../../../api/client/ansible/gitRemotes";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { gitRemotesListRootKey } from "./queryKeys";

export function useDeleteGitRemoteMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href }: { href: string; name: string }) => deleteGitRemote(href),
    onSuccess: ({ task }, { href, name }) => {
      registerTask({
        href: task,
        label: `Delete remote "${name}"`,
        resourceHrefs: [href],
        action: "delete",
        invalidateKeys: [gitRemotesListRootKey],
      });
    },
  });
}
