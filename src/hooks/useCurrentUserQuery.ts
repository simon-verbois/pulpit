import { useQuery } from "@tanstack/react-query";

import { getCurrentUser } from "../api/client/auth";

// "Who is currently logged in" is Pulp server state like anything else
// (ADR 0003) - not a bespoke auth store. A 401 here just means "no session",
// which callers (RequireAuth, LoginPage) distinguish via
// `error.kind === "unauthenticated"` rather than treating it as a fetch failure.
export const CURRENT_USER_QUERY_KEY = ["pulp", "currentUser"] as const;

export function useCurrentUserQuery() {
  return useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: getCurrentUser,
  });
}
