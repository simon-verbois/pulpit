import { coreFetch, corePath } from "./httpClient";
import type {
  DefaultProxyCredentials,
  DefaultSettings,
  DefaultSettingsUpdate,
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
