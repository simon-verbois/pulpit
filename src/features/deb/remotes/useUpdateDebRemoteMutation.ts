import { useMutation } from "@tanstack/react-query";

import { updateDebRemote } from "../../../api/client/deb/remotes";
import type { DebRemoteUpdate } from "../../../api/client/deb/types";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { debRemotesListRootKey } from "./queryKeys";

interface UpdateArgs {
  href: string;
  name: string;
  data: DebRemoteUpdate;
}

/** Update is asynchronous (VERIFIED: 202 + task), unlike create. */
export function useUpdateDebRemoteMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href, data }: UpdateArgs) => updateDebRemote(href, data),
    onSuccess: ({ task }, { href, name }) => {
      registerTask({
        href: task,
        label: `Update remote "${name}"`,
        resourceHrefs: [href],
        action: "edit",
        invalidateKeys: [debRemotesListRootKey],
      });
    },
  });
}
