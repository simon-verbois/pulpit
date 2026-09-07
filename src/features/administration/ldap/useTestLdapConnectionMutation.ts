import { useMutation } from "@tanstack/react-query";

import { testLdapConnection } from "../../../api/client/pulpitCore/ldap";
import type { LdapTestConnectionRequest } from "../../../api/client/pulpitCore/types";

export function useTestLdapConnectionMutation() {
  return useMutation({
    mutationFn: (overrides: LdapTestConnectionRequest) => testLdapConnection(overrides),
  });
}
