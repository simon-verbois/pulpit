import { useMutation } from "@tanstack/react-query";

import { updateMavenRemote } from "../../../api/client/maven/remotes";
import type { MavenRemoteUpdate } from "../../../api/client/maven/types";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { mavenRemotesListRootKey } from "./queryKeys";

interface UpdateArgs {
  href: string;
  name: string;
  data: MavenRemoteUpdate;
}

/** Update is asynchronous (VERIFIED: 202 + task), unlike create. */
export function useUpdateMavenRemoteMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href, data }: UpdateArgs) => updateMavenRemote(href, data),
    onSuccess: ({ task }, { name }) => {
      registerTask({
        href: task,
        label: `Update remote "${name}"`,
        invalidateKeys: [mavenRemotesListRootKey],
      });
    },
  });
}
