export const signingSettingsKey = ["pulpit-core", "signing", "settings"] as const;
export const signingKeysListKey = ["pulpit-core", "signing", "keys"] as const;
export const signingKeyPulpServicesKey = (keyId: string) =>
  ["pulpit-core", "signing", "keys", keyId, "pulp-services"] as const;
export const repositorySigningPolicyKey = [
  "pulpit-core",
  "signing",
  "repositories",
  "policy",
] as const;
