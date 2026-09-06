import { useMutation } from "@tanstack/react-query";

import { updatePythonRemote } from "../../../api/client/python/remotes";
import type { PythonRemoteUpdate } from "../../../api/client/python/types";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { pythonRemotesListRootKey } from "./queryKeys";

interface UpdateArgs {
  href: string;
  name: string;
  data: PythonRemoteUpdate;
}

/** Update is asynchronous (VERIFIED: 202 + task), unlike create. */
export function useUpdatePythonRemoteMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href, data }: UpdateArgs) => updatePythonRemote(href, data),
    onSuccess: ({ task }, { name }) => {
      registerTask({
        href: task,
        label: `Update remote "${name}"`,
        invalidateKeys: [pythonRemotesListRootKey],
      });
    },
  });
}
