import { useMutation } from "@tanstack/react-query";

import { updateGemRemote } from "../../../api/client/gem/remotes";
import type { GemRemoteUpdate } from "../../../api/client/gem/types";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { gemRemotesListRootKey } from "./queryKeys";

interface UpdateArgs {
  href: string;
  name: string;
  data: GemRemoteUpdate;
}

/** Update is asynchronous (VERIFIED: 202 + task), unlike create. */
export function useUpdateGemRemoteMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href, data }: UpdateArgs) => updateGemRemote(href, data),
    onSuccess: ({ task }, { name }) => {
      registerTask({
        href: task,
        label: `Update remote "${name}"`,
        invalidateKeys: [gemRemotesListRootKey],
      });
    },
  });
}
