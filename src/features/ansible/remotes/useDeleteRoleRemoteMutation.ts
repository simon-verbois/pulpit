import { useMutation } from "@tanstack/react-query";

import { deleteRoleRemote } from "../../../api/client/ansible/roleRemotes";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { roleRemotesListRootKey } from "./queryKeys";

export function useDeleteRoleRemoteMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href }: { href: string; name: string }) => deleteRoleRemote(href),
    onSuccess: ({ task }, { name }) => {
      registerTask({
        href: task,
        label: `Delete remote "${name}"`,
        invalidateKeys: [roleRemotesListRootKey],
      });
    },
  });
}
