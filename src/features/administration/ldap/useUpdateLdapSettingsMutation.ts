import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateLdapSettings } from "../../../api/client/pulpitCore/ldap";
import { ldapSettingsKey } from "./queryKeys";

export function useUpdateLdapSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateLdapSettings,
    onSuccess: (data) => {
      queryClient.setQueryData(ldapSettingsKey, data);
    },
  });
}
