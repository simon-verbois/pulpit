import { useMutation } from "@tanstack/react-query";

import { updateContainerRemote } from "../../../api/client/container/remotes";
import type { ContainerRemoteUpdate } from "../../../api/client/container/types";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { containerRemotesListRootKey } from "./queryKeys";

interface UpdateArgs {
  href: string;
  name: string;
  data: ContainerRemoteUpdate;
}

/** VERIFIED against the live instance: update is asynchronous (202 + task). */
export function useUpdateContainerRemoteMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href, data }: UpdateArgs) => updateContainerRemote(href, data),
    onSuccess: ({ task }, { name, data }) => {
      registerTask({
        href: task,
        label: `Update remote "${data.name ?? name}"`,
        invalidateKeys: [containerRemotesListRootKey],
      });
    },
  });
}
