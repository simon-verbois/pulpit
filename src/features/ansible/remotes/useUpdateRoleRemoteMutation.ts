import { useMutation } from "@tanstack/react-query";

import { updateRoleRemote } from "../../../api/client/ansible/roleRemotes";
import type { RoleRemoteUpdate } from "../../../api/client/ansible/types";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { roleRemotesListRootKey } from "./queryKeys";

export function useUpdateRoleRemoteMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({
      href,
      data,
    }: {
      href: string;
      name: string;
      data: RoleRemoteUpdate;
    }) => updateRoleRemote(href, data),
    onSuccess: ({ task }, { name }) => {
      registerTask({
        href: task,
        label: `Update remote "${name}"`,
        invalidateKeys: [roleRemotesListRootKey],
      });
    },
  });
}
