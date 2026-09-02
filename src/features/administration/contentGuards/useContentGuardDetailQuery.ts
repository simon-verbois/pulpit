import { useQuery } from "@tanstack/react-query";

import { getContentGuardDetail } from "../../../api/client/administration/contentGuards";
import { contentGuardDetailKey } from "./queryKeys";

/** Fetches the flavor-specific fields the generic list doesn't carry
 * (header_name, ca_certificate, guards, users/groups...) - the href itself
 * already points at the right flavor's endpoint (VERIFIED live). */
export function useContentGuardDetailQuery<T>(href: string) {
  return useQuery({
    queryKey: contentGuardDetailKey(href),
    queryFn: () => getContentGuardDetail<T>(href),
  });
}
