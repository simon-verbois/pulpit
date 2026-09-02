import { useMutation } from "@tanstack/react-query";

import { updateRpmRemote } from "../../../api/client/rpm/remotes";
import type { RpmRemoteUpdate } from "../../../api/client/rpm/types";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { rpmRemotesListRootKey } from "./queryKeys";

interface UpdateArgs {
  href: string;
  name: string;
  data: RpmRemoteUpdate;
}

/** Update is asynchronous (VERIFIED: 202 + task), unlike create. */
export function useUpdateRpmRemoteMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href, data }: UpdateArgs) => updateRpmRemote(href, data),
    onSuccess: ({ task }, { name }) => {
      registerTask({
        href: task,
        label: `Update remote "${name}"`,
        invalidateKeys: [rpmRemotesListRootKey],
      });
    },
  });
}
