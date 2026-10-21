export const distributionPathPrefixes = {
  ansible: "ansible",
  container: "container",
  deb: "deb",
  file: "file",
  gem: "gem",
  huggingFace: "hugging-face",
  maven: "maven",
  npm: "npm",
  python: "python",
  rpm: "rpm",
} as const;

export type DistributionModule = keyof typeof distributionPathPrefixes;

export function distributionPathPrefix(module: DistributionModule): string {
  return `${distributionPathPrefixes[module]}/`;
}

export function buildDistributionBasePath(
  module: DistributionModule,
  suffix: string,
): string {
  return `${distributionPathPrefix(module)}${suffix}`;
}

/** Pulp rejects a base path containing spaces (VERIFIED in pulpcore's
 * relative-path validator: "Relative path cannot contain spaces."), while a
 * distribution name may contain them. Turns a name into a path segment by
 * collapsing each run of whitespace into one "-". */
export function distributionPathSegment(name: string): string {
  return name.trim().replace(/\s+/g, "-");
}

export function buildVersionedDistributionName(
  repositoryName: string,
  versionNumber?: number,
): string {
  return versionNumber === undefined
    ? repositoryName
    : `${repositoryName}-v${versionNumber}`;
}
