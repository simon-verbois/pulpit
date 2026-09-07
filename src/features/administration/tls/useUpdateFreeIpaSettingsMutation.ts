import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateFreeIpaSettings } from "../../../api/client/pulpitCore/tls";
import { tlsFreeIpaSettingsKey } from "./queryKeys";

export function useUpdateFreeIpaSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateFreeIpaSettings,
    onSuccess: (data) => {
      queryClient.setQueryData(tlsFreeIpaSettingsKey, data);
    },
  });
}
