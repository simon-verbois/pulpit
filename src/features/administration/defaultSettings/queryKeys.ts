export const defaultSettingsKey = ["pulpit-core", "default-settings"] as const;

// Deliberately its own query key, never merged into defaultSettingsKey's
// cache entry - see DefaultProxyCredentials (src/api/client/pulpitCore/
// types.ts) on why this is a separate, narrowly-fetched request holding the
// real decrypted password.
export const defaultProxyCredentialsKey = [
  "pulpit-core",
  "default-settings",
  "proxy-credentials",
] as const;
