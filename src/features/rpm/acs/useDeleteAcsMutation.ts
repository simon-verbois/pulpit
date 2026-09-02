import { useMutation } from "@tanstack/react-query";

import { deleteAlternateContentSource } from "../../../api/client/rpm/acs";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { acsListRootKey } from "./queryKeys";

export function useDeleteAcsMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href }: { href: string; name: string }) =>
      deleteAlternateContentSource(href),
    onSuccess: ({ task }, { name }) => {
      registerTask({
        href: task,
        label: `Delete alternate content source "${name}"`,
        invalidateKeys: [acsListRootKey],
      });
    },
  });
}
