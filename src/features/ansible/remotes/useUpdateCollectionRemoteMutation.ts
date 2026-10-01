import { useMutation } from "@tanstack/react-query";

import { updateCollectionRemote } from "../../../api/client/ansible/collectionRemotes";
import type { CollectionRemoteUpdate } from "../../../api/client/ansible/types";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { collectionRemotesListRootKey } from "./queryKeys";

export function useUpdateCollectionRemoteMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({
      href,
      data,
    }: {
      href: string;
      name: string;
      data: CollectionRemoteUpdate;
    }) => updateCollectionRemote(href, data),
    onSuccess: ({ task }, { href, name }) => {
      registerTask({
        href: task,
        label: `Update remote "${name}"`,
        resourceHrefs: [href],
        action: "edit",
        invalidateKeys: [collectionRemotesListRootKey],
      });
    },
  });
}
