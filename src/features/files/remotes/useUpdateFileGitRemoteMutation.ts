import { useMutation } from "@tanstack/react-query";

import { updateFileGitRemote } from "../../../api/client/file/gitRemotes";
import type { FileGitRemoteUpdate } from "../../../api/client/file/types";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { fileGitRemotesListRootKey } from "./queryKeys";

interface UpdateArgs {
  href: string;
  name: string;
  data: FileGitRemoteUpdate;
}

/** Update is asynchronous (VERIFIED: 202 + task), unlike create. */
export function useUpdateFileGitRemoteMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href, data }: UpdateArgs) => updateFileGitRemote(href, data),
    onSuccess: ({ task }, { href, name }) => {
      registerTask({
        href: task,
        label: `Update Git remote "${name}"`,
        resourceHrefs: [href],
        action: "edit",
        invalidateKeys: [fileGitRemotesListRootKey],
      });
    },
  });
}
