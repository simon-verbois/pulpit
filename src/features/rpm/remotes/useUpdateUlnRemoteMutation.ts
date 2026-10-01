import { useMutation } from "@tanstack/react-query";

import { updateRpmUlnRemote } from "../../../api/client/rpm/ulnRemotes";
import type { RpmUlnRemoteUpdate } from "../../../api/client/rpm/types";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { rpmRemoteOptionsQueryKey, rpmUlnRemotesListRootKey } from "./queryKeys";

interface UpdateArgs {
  href: string;
  name: string;
  data: RpmUlnRemoteUpdate;
}

/** Update is asynchronous (VERIFIED live against pulp_rpm 3.38.5). */
export function useUpdateUlnRemoteMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href, data }: UpdateArgs) => updateRpmUlnRemote(href, data),
    onSuccess: ({ task }, { href, name }) => {
      registerTask({
        href: task,
        label: `Update ULN remote "${name}"`,
        resourceHrefs: [href],
        action: "edit",
        invalidateKeys: [rpmUlnRemotesListRootKey, rpmRemoteOptionsQueryKey],
      });
    },
  });
}
