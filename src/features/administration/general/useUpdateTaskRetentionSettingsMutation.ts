import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateTaskRetentionSettings } from "../../../api/client/pulpitCore/taskRetention";
import { taskRetentionSettingsKey } from "./useTaskRetentionSettingsQuery";

export function useUpdateTaskRetentionSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateTaskRetentionSettings,
    onSuccess: (data) => {
      queryClient.setQueryData(taskRetentionSettingsKey, data);
    },
  });
}
