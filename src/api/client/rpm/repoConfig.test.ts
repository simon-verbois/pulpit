import { describe, expect, it } from "vitest";

import { computeRpmRepoConfig, generateRpmConfigRepo } from "./repoConfig";
import type { RpmDistribution, RpmRepository } from "./types";

describe("computeRpmRepoConfig", () => {
  it("turns gpgcheck/repo_gpgcheck off and sslverify off for an unsigned http repository", () => {
    expect(computeRpmRepoConfig(false, false, "http://localhost:8080")).toEqual({
      gpgcheck: 0,
      repo_gpgcheck: 0,
      sslverify: 0,
    });
  });

  it("turns gpgcheck/repo_gpgcheck/sslverify on for a fully signed https repository", () => {
    expect(computeRpmRepoConfig(true, true, "https://pulp.example.com")).toEqual({
      gpgcheck: 1,
      repo_gpgcheck: 1,
      sslverify: 1,
    });
  });

  it("sets gpgcheck/repo_gpgcheck independently of each other", () => {
    expect(computeRpmRepoConfig(true, false, "http://localhost:8080")).toEqual({
      gpgcheck: 1,
      repo_gpgcheck: 0,
      sslverify: 0,
    });
  });
});

const DISTRIBUTION: RpmDistribution = {
  pulp_href: "/pulp/api/v3/distributions/rpm/rpm/dist-1/",
  name: "internal-epel",
  base_path: "epel-9",
  base_url: "https://pulp.smp.deep.cloud:8443/pulp/content/rpm/epel-9/",
  repository: "/pulp/api/v3/repositories/rpm/rpm/repo-1/",
  publication: "/pulp/api/v3/publications/rpm/rpm/pub-1/",
  pulp_created: "2026-08-20T10:00:00.000000Z",
  generate_repo_config: true,
};

const REPOSITORY: RpmRepository = {
  pulp_href: "/pulp/api/v3/repositories/rpm/rpm/repo-1/",
  name: "epel-9",
  description: "Internal EPEL repository for RHEL 9",
  remote: null,
  autopublish: false,
  versions_href: "/pulp/api/v3/repositories/rpm/rpm/repo-1/versions/",
  latest_version_href: "/pulp/api/v3/repositories/rpm/rpm/repo-1/versions/1/",
  pulp_created: "2026-08-20T10:00:00.000000Z",
};

describe("generateRpmConfigRepo", () => {
  it("renders the full config.repo for a signed, described repository", () => {
    expect(
      generateRpmConfigRepo(DISTRIBUTION, {
        ...REPOSITORY,
        repo_config: { gpgcheck: 1, repo_gpgcheck: 1, sslverify: 1 },
      }),
    ).toBe(
      [
        "[internal-epel]",
        "name=Internal EPEL repository for RHEL 9",
        "baseurl=https://pulp.smp.deep.cloud:8443/pulp/content/rpm/epel-9/",
        "enabled=1",
        "gpgcheck=1",
        "repo_gpgcheck=1",
        "sslverify=1",
        "gpgkey=https://pulp.smp.deep.cloud:8443/pulp/content/rpm/epel-9/repodata/repomd.xml.key",
        "",
      ].join("\n"),
    );
  });

  it("omits the name= line when the repository has no description", () => {
    const config = generateRpmConfigRepo(DISTRIBUTION, {
      ...REPOSITORY,
      description: null,
    });

    expect(config).not.toContain("name=");
  });

  it("defaults gpgcheck/repo_gpgcheck to 0 and omits gpgkey when repo_config is unset", () => {
    const config = generateRpmConfigRepo(DISTRIBUTION, REPOSITORY);

    expect(config).toContain("gpgcheck=0");
    expect(config).toContain("repo_gpgcheck=0");
    expect(config).not.toContain("gpgkey=");
    expect(config).not.toContain("sslverify=");
  });

  it("uses an explicit gpgkey instead of the default repomd.xml.key URL", () => {
    const config = generateRpmConfigRepo(DISTRIBUTION, {
      ...REPOSITORY,
      repo_config: {
        repo_gpgcheck: 1,
        gpgkey: "https://pulp.smp.deep.cloud:8443/keys/custom-key.asc",
      },
    });

    expect(config).toContain(
      "gpgkey=https://pulp.smp.deep.cloud:8443/keys/custom-key.asc",
    );
  });
});
