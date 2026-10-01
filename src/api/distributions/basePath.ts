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

export function buildVersionedDistributionName(
  repositoryName: string,
  versionNumber?: number,
): string {
  return versionNumber === undefined
    ? repositoryName
    : `${repositoryName}-v${versionNumber}`;
}
