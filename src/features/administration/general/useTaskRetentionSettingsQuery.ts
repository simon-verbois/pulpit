import { useQuery } from "@tanstack/react-query";

import { getTaskRetentionSettings } from "../../../api/client/pulpitCore/taskRetention";

export const taskRetentionSettingsKey = ["pulpit-core", "task-retention", "settings"];

export function useTaskRetentionSettingsQuery() {
  return useQuery({
    queryKey: taskRetentionSettingsKey,
    queryFn: getTaskRetentionSettings,
  });
}
