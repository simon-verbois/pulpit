import type { RpmRepoConfig } from "./types";

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
 * Fetches the actual `config.repo` a real `dnf`/`yum` client would get from
 * this distribution (VERIFIED live: `<base_url>config.repo`, a plain
 * unauthenticated GET - not a Pulp API JSON endpoint, hence a plain `fetch`
 * here rather than `pulpFetch`). Deliberately reads the real served file
 * instead of reconstructing it client-side: Pulp's own key ordering for
 * extra `repo_config` keys is not simple insertion order (VERIFIED live),
 * so a hand-built reconstruction could show a plausible-looking but wrong
 * line order. 404s if `generate_repo_config` is off or the repository has
 * never been published.
 */
export async function fetchRpmConfigRepo(baseUrl: string): Promise<string> {
  const response = await fetch(`${baseUrl}config.repo`);
  if (!response.ok) {
    throw new Error(`config.repo request failed: ${response.status}`);
  }
  return response.text();
}
