import { useMutation } from "@tanstack/react-query";

import { deleteFileGitRemote } from "../../../api/client/file/gitRemotes";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { fileGitRemotesListRootKey } from "./queryKeys";

export function useDeleteFileGitRemoteMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href }: { href: string; name: string }) => deleteFileGitRemote(href),
    onSuccess: ({ task }, { href, name }) => {
      registerTask({
        href: task,
        label: `Delete Git remote "${name}"`,
        resourceHrefs: [href],
        action: "delete",
        invalidateKeys: [fileGitRemotesListRootKey],
      });
    },
  });
}
