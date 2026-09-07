import { useQuery } from "@tanstack/react-query";

import { getLdapSettings } from "../../../api/client/pulpitCore/ldap";
import { ldapSettingsKey } from "./queryKeys";

export function useLdapSettingsQuery() {
  return useQuery({
    queryKey: ldapSettingsKey,
    queryFn: getLdapSettings,
  });
}
