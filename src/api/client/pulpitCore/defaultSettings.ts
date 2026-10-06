import { coreFetch, corePath } from "./httpClient";
import type { DefaultSettings, DefaultSettingsUpdate } from "./types";

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
