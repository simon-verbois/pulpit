import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateDefaultSettings } from "../../../api/client/pulpitCore/defaultSettings";
import { defaultSettingsKey } from "./queryKeys";

export function useUpdateDefaultSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateDefaultSettings,
    onSuccess: (data) => {
      queryClient.setQueryData(defaultSettingsKey, data);
    },
  });
}
