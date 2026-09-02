import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateSigningSettings } from "../../../api/client/pulpitCore/signing";
import { signingSettingsKey } from "./queryKeys";

export function useUpdateSigningSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateSigningSettings,
    onSuccess: (data) => {
      queryClient.setQueryData(signingSettingsKey, data);
    },
  });
}
