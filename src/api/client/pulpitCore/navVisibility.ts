import { coreFetch, corePath } from "./httpClient";
import type { NavVisibilitySettings, ResolvedNavVisibility } from "./types";

const BASE = corePath("/nav_visibility");

/** Only reachable by staff users (VERIFIED: pulpit-core returns 403
 * otherwise - see app/core/auth.py's require_staff_user). */
export function getNavVisibilitySettings(): Promise<NavVisibilitySettings> {
  return coreFetch<NavVisibilitySettings>(`${BASE}/settings`);
}

export function updateNavVisibilitySettings(
  visibleModuleIds: string[],
): Promise<NavVisibilitySettings> {
  return coreFetch<NavVisibilitySettings>(`${BASE}/settings`, {
    method: "PUT",
    body: JSON.stringify({ visible_module_ids: visibleModuleIds }),
  });
}

/** The resolved nav-visibility for the CURRENTLY authenticated user - this
 * is what AppNav.tsx actually filters on. No staff requirement (unlike the
 * function above): this only ever answers "what should I see". */
export function getMyNavVisibility(): Promise<ResolvedNavVisibility> {
  return coreFetch<ResolvedNavVisibility>(`${BASE}/me`);
}
