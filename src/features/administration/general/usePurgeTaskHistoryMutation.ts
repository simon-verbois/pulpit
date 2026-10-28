import { useMutation } from "@tanstack/react-query";

import { purgeTaskHistoryNow } from "../../../api/client/pulpitCore/taskRetention";
import { taskRetentionSettingsKey } from "./useTaskRetentionSettingsQuery";
import { useTasksContext } from "../../../api/tasks/TasksContext";

export function usePurgeTaskHistoryMutation() {
  const { registerTask } = useTasksContext();
  return useMutation({
    mutationFn: purgeTaskHistoryNow,
    onSuccess: (job) => {
      registerTask({
        href: job.id,
        kind: "job",
        label: "Purge task history",
        invalidateKeys: [taskRetentionSettingsKey, ["pulp", "tasks"]],
        invalidateOnFailure: true,
      });
    },
  });
}
