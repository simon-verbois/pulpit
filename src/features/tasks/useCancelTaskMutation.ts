import { useMutation, useQueryClient } from "@tanstack/react-query";

import { cancelTask, type PulpTask } from "../../api/client/tasks";

export function useCancelTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (task: PulpTask) => cancelTask(task.pulp_href),
    onSuccess: (task) => {
      queryClient.setQueryData(["pulp", "task", task.pulp_href], task);
      void queryClient.invalidateQueries({ queryKey: ["pulp", "tasks", "history"] });
    },
  });
}
