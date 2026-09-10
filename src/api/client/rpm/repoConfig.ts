import type { RpmDistribution, RpmRepoConfig, RpmRepository } from "./types";

/**
 * The `repo_config` pulpit auto-applies to a repository's distribution(s) -
 * VERIFIED live (see RpmRepoConfig's own doc comment): Pulp does NOT turn
 * `gpgcheck`/`repo_gpgcheck` on just because a signing service is
 * configured, so this mirrors the repository's actual current signing state
 * into the values a real `dnf`/`yum` client needs. `gpgkey` is deliberately
 * left unset here even when only package signing (not metadata signing) is
 * configured - Pulp only auto-serves a key at `repodata/repomd.xml.key`
 * when `metadata_signing_service` is set (VERIFIED live), and pulpit's own
 * signing module always configures both together (docs/signing.md: "one
 * active, published signing key... used to sign RPM packages and/or
 * repository metadata"), so this gap is deliberately not covered - there is
 * no separate "package-only" key URL to point at in this app's model.
 */
export function computeRpmRepoConfig(
  isPackageSigned: boolean,
  isMetadataSigned: boolean,
  contentOrigin: string,
): RpmRepoConfig {
  return {
    gpgcheck: isPackageSigned ? 1 : 0,
    repo_gpgcheck: isMetadataSigned ? 1 : 0,
    sslverify: contentOrigin.startsWith("https://") ? 1 : 0,
  };
}

/**
 * Builds the `config.repo` preview shown in the UI entirely from data
 * already loaded client-side (distribution + repository), instead of
 * fetching `<base_url>config.repo` from Pulp itself. That round trip was
 * slow in production and 404s until the repository is actually published,
 * which surfaced as a confusing "couldn't load it" message for a file that
 * simply isn't needed to know what the config *will* say. This mirrors
 * pulp_rpm's own generator closely enough for a preview (name/baseurl/
 * enabled always present, gpgcheck/repo_gpgcheck default to 0, gpgkey falls
 * back to the repo's own `repodata/repomd.xml.key` whenever metadata
 * signing - repo_gpgcheck - is on) but is not guaranteed byte-for-byte
 * identical to the real served file - real client tooling should still
 * point at `<base_url>config.repo` directly.
 */
export function generateRpmConfigRepo(
  distribution: RpmDistribution,
  repository: RpmRepository,
): string {
  const repoConfig: RpmRepoConfig = repository.repo_config ?? {};
  const gpgcheck = repoConfig.gpgcheck ?? 0;
  const repoGpgcheck = repoConfig.repo_gpgcheck ?? 0;

  const lines = [`[${distribution.name}]`];
  if (repository.description) {
    lines.push(`name=${repository.description}`);
  }
  lines.push(`baseurl=${distribution.base_url}`);
  lines.push("enabled=1");
  lines.push(`gpgcheck=${gpgcheck}`);
  lines.push(`repo_gpgcheck=${repoGpgcheck}`);
  if (typeof repoConfig.sslverify !== "undefined") {
    lines.push(`sslverify=${repoConfig.sslverify}`);
  }

  const gpgkey =
    typeof repoConfig.gpgkey === "string"
      ? repoConfig.gpgkey
      : repoGpgcheck === 1
        ? `${distribution.base_url}repodata/repomd.xml.key`
        : undefined;
  if (gpgkey) {
    lines.push(`gpgkey=${gpgkey}`);
  }

  return lines.join("\n") + "\n";
}
