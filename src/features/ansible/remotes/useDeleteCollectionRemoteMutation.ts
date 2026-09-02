import { useMutation } from "@tanstack/react-query";

import { deleteCollectionRemote } from "../../../api/client/ansible/collectionRemotes";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { collectionRemotesListRootKey } from "./queryKeys";

export function useDeleteCollectionRemoteMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href }: { href: string; name: string }) =>
      deleteCollectionRemote(href),
    onSuccess: ({ task }, { name }) => {
      registerTask({
        href: task,
        label: `Delete remote "${name}"`,
        invalidateKeys: [collectionRemotesListRootKey],
      });
    },
  });
}
