import { useQuery } from "@tanstack/react-query";

import { getMyNavVisibility } from "../api/client/pulpitCore/navVisibility";

/** The current user's resolved nav-visibility (allow-list, default-visible,
 * same for every user regardless of role - docs/adr/
 * 0009-nav-visibility-settings.md). See AppNav.tsx for how
 * `visible_module_ids: null` (unrestricted - nothing configured yet, or
 * still loading/errored) combines with plugin-capability gating.
 *
 * Fails open while loading or on error, same as capability gating (never
 * hide real navigation over a transient problem) - `data` is `undefined`
 * in both cases, and AppNav treats that exactly like the real
 * `null` ("unrestricted") response. This is safe here specifically because
 * it's UI convenience, never a security boundary: a transient failure
 * briefly over-shows sections rather than locking anyone out of their own
 * sidebar. */
export function useNavVisibilityQuery() {
  return useQuery({
    queryKey: ["pulpit-core", "nav-visibility", "me"],
    queryFn: getMyNavVisibility,
  });
}
