import { coreFetch, corePath } from "./httpClient";
import type {
  Job,
  LdapSettings,
  LdapSettingsUpdate,
  LdapTestConnectionRequest,
} from "./types";

const BASE = corePath("/ldap");

export function getLdapSettings(): Promise<LdapSettings> {
  return coreFetch<LdapSettings>(`${BASE}/settings`);
}

export function updateLdapSettings(changes: LdapSettingsUpdate): Promise<LdapSettings> {
  return coreFetch<LdapSettings>(`${BASE}/settings`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
}

/** Staff-only. Writes the currently-saved LDAP config out to Pulp and
 * restarts its API process to pick it up - disruptive (every user's login
 * goes through the restarted process for a few seconds), unlike saving
 * settings above, which never reaches Pulp on its own. See
 * app/modules/ldap/jobs.py's apply_config_job docstring for exactly what
 * the resulting job's result can and can't confirm. */
export function applyLdapConfig(): Promise<Job> {
  return coreFetch<Job>(`${BASE}/settings/apply`, { method: "POST" });
}

/** Staff-only. Direct LDAP bind (+ one search, if a search base is given)
 * against whatever is passed here - never against Pulp, never persisted.
 * Pass only the fields that differ from what's already saved; omitted
 * fields fall back to the saved row (LdapTestConnectionRequest). */
export function testLdapConnection(overrides: LdapTestConnectionRequest): Promise<Job> {
  return coreFetch<Job>(`${BASE}/settings/test-connection`, {
    method: "POST",
    body: JSON.stringify(overrides),
  });
}
