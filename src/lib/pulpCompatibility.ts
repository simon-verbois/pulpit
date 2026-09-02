/**
 * The pulpcore/plugin versions each of this app's feature areas was last
 * VERIFIED live against (docs/ROADMAP.md, per-milestone "VERIFIED against a
 * live pulpcore X.Y.Z / plugin A.B.C instance" notes). Not every reported
 * status component has an entry - only the ones Pulpit has a UI for.
 *
 * Compared at major.minor granularity: a patch-level difference is not
 * worth warning about, but a different minor/major version is where a
 * plugin's API has historically been observed to change shape in this
 * project (docs/ROADMAP.md "API/version-compatibility handling").
 */
export const VERIFIED_VERSIONS: Record<string, string> = {
  core: "3.116.0",
  rpm: "3.38.5",
  ansible: "0.30.0",
  container: "2.29.0",
};

export type CompatibilityStatus = "matches" | "newer" | "older" | "unverified";

function majorMinor(version: string): [number, number] | null {
  const match = /^(\d+)\.(\d+)/.exec(version);
  if (!match) {
    return null;
  }
  return [Number(match[1]), Number(match[2])];
}

/** Compares an installed component version against Pulpit's verified
 * baseline for it, if one exists. Never throws on an unparseable version -
 * falls back to "unverified" rather than guessing. */
export function compatibilityStatus(
  component: string,
  installedVersion: string,
): CompatibilityStatus {
  const baseline = VERIFIED_VERSIONS[component];
  if (!baseline) {
    return "unverified";
  }
  const installed = majorMinor(installedVersion);
  const verified = majorMinor(baseline);
  if (!installed || !verified) {
    return "unverified";
  }
  if (installed[0] === verified[0] && installed[1] === verified[1]) {
    return "matches";
  }
  const isNewer =
    installed[0] > verified[0] ||
    (installed[0] === verified[0] && installed[1] > verified[1]);
  return isNewer ? "newer" : "older";
}
