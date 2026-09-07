import { useStatusQuery } from "./useStatusQuery";

/** Pulp's own CONTENT_ORIGIN setting (Django, the PULP_CONTENT_ORIGIN env
 * var) - what a Distribution's real base_url is actually built from
 * server-side once created, which can silently differ from
 * window.location.origin whenever CONTENT_ORIGIN isn't configured to match
 * the public origin this app is really reached at (a Create-distribution
 * URL preview built from window.location.origin alone would then show a
 * different URL than the one Pulp actually assigns - VERIFIED live:
 * GET /pulp/api/v3/status/ exposes the real value under
 * content_settings.content_origin). Falls back to window.location.origin
 * only while status hasn't loaded yet (or failed to), so a preview never
 * shows a bare "undefined". */
export function useContentOrigin(): string {
  const statusQuery = useStatusQuery();
  return statusQuery.data?.content_settings?.content_origin ?? window.location.origin;
}
