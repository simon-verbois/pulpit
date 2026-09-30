import { useQuery } from "@tanstack/react-query";

import { getRpmRemote } from "../../../api/client/rpm/remotes";
import { rpmRemoteByHrefKey } from "../remotes/queryKeys";

/** The repository's default remote, resolved from its href so the Overview
 * can show which remote it actually is instead of just "Configured". */
export function useRpmRemoteQuery(href: string | null) {
  return useQuery({
    queryKey: rpmRemoteByHrefKey(href ?? ""),
    queryFn: () => getRpmRemote(href as string),
    enabled: Boolean(href),
  });
}
