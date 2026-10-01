import { useMutation } from "@tanstack/react-query";

import { updateGitRemote } from "../../../api/client/ansible/gitRemotes";
import type { GitRemoteUpdate } from "../../../api/client/ansible/types";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { gitRemotesListRootKey } from "./queryKeys";

export function useUpdateGitRemoteMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href, data }: { href: string; name: string; data: GitRemoteUpdate }) =>
      updateGitRemote(href, data),
    onSuccess: ({ task }, { href, name }) => {
      registerTask({
        href: task,
        label: `Update remote "${name}"`,
        resourceHrefs: [href],
        action: "edit",
        invalidateKeys: [gitRemotesListRootKey],
      });
    },
  });
}
