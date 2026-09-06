import { coreFetch, corePath } from "./httpClient";
import type {
  DefaultProxyCredentials,
  DefaultSettings,
  DefaultSettingsUpdate,
  Job,
} from "./types";

const BASE = corePath("/default_settings");

export function getDefaultSettings(): Promise<DefaultSettings> {
  return coreFetch<DefaultSettings>(`${BASE}/settings`);
}

export function updateDefaultSettings(
  changes: DefaultSettingsUpdate,
): Promise<DefaultSettings> {
  return coreFetch<DefaultSettings>(`${BASE}/settings`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
}

/** The real, decrypted proxy password - see DefaultProxyCredentials. Call
 * only when actually about to apply the default proxy to a Remote. */
export function getDefaultProxyCredentials(): Promise<DefaultProxyCredentials> {
  return coreFetch<DefaultProxyCredentials>(`${BASE}/proxy-credentials`);
}

/** Staff-only (VERIFIED: pulpit-core returns 403 otherwise - see
 * app/core/auth.py's require_staff_user). Enqueues a pulpit-core job that
 * PATCHes the currently-saved proxy settings onto EVERY existing Remote
 * across every plugin, overwriting whatever each one's own proxy fields
 * currently are - unlike the automatic "use instance default" a new Remote
 * can opt into, this is explicit, retroactive, and irreversible (the
 * previous per-remote values aren't recorded anywhere). */
export function applyDefaultProxyToAllRemotes(): Promise<Job> {
  return coreFetch<Job>(`${BASE}/apply-proxy-to-all-remotes`, { method: "POST" });
}
