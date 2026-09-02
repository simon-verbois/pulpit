import { useQuery } from "@tanstack/react-query";

import { getUser } from "../../../api/client/access/users";
import { userByHrefKey } from "./queryKeys";

/** Resolves a user href (e.g. a task's `created_by`) to the full user
 * record. `href` may be absent (a system-initiated task has no creator). */
export function useUserQuery(href: string | null | undefined) {
  return useQuery({
    queryKey: userByHrefKey(href ?? ""),
    queryFn: () => getUser(href as string),
    enabled: Boolean(href),
  });
}
