import { useMutation } from "@tanstack/react-query";

import { updateFileRemote } from "../../../api/client/file/remotes";
import type { FileRemoteUpdate } from "../../../api/client/file/types";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { fileRemotesListRootKey } from "./queryKeys";

interface UpdateArgs {
  href: string;
  name: string;
  data: FileRemoteUpdate;
}

/** Update is asynchronous (VERIFIED: 202 + task), unlike create. */
export function useUpdateFileRemoteMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href, data }: UpdateArgs) => updateFileRemote(href, data),
    onSuccess: ({ task }, { name }) => {
      registerTask({
        href: task,
        label: `Update remote "${name}"`,
        invalidateKeys: [fileRemotesListRootKey],
      });
    },
  });
}
