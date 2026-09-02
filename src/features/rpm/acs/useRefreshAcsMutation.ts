import { useMutation } from "@tanstack/react-query";

import { refreshAlternateContentSource } from "../../../api/client/rpm/acs";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { acsListRootKey } from "./queryKeys";

export function useRefreshAcsMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href }: { href: string; name: string }) =>
      refreshAlternateContentSource(href),
    onSuccess: ({ task }, { name }) => {
      registerTask({
        href: task,
        label: `Refresh alternate content source "${name}"`,
        invalidateKeys: [acsListRootKey],
      });
    },
  });
}
