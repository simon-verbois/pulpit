import { useMutation } from "@tanstack/react-query";

import { updateNpmRemote } from "../../../api/client/npm/remotes";
import type { NpmRemoteUpdate } from "../../../api/client/npm/types";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { npmRemotesListRootKey } from "./queryKeys";

interface UpdateArgs {
  href: string;
  name: string;
  data: NpmRemoteUpdate;
}

/** Update is asynchronous (VERIFIED: 202 + task), unlike create. */
export function useUpdateNpmRemoteMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href, data }: UpdateArgs) => updateNpmRemote(href, data),
    onSuccess: ({ task }, { name }) => {
      registerTask({
        href: task,
        label: `Update remote "${name}"`,
        invalidateKeys: [npmRemotesListRootKey],
      });
    },
  });
}
