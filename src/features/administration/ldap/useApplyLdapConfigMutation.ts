import { useMutation } from "@tanstack/react-query";

import { applyLdapConfig } from "../../../api/client/pulpitCore/ldap";

export function useApplyLdapConfigMutation() {
  return useMutation({
    mutationFn: applyLdapConfig,
  });
}
