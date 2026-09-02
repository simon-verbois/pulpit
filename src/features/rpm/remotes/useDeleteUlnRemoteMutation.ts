import { useMutation } from "@tanstack/react-query";

import { deleteRpmUlnRemote } from "../../../api/client/rpm/ulnRemotes";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { rpmUlnRemotesListRootKey } from "./queryKeys";

export function useDeleteUlnRemoteMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href }: { href: string; name: string }) => deleteRpmUlnRemote(href),
    onSuccess: ({ task }, { name }) => {
      registerTask({
        href: task,
        label: `Delete ULN remote "${name}"`,
        invalidateKeys: [rpmUlnRemotesListRootKey],
      });
    },
  });
}
