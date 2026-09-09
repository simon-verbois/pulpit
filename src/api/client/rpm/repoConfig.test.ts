import { describe, expect, it } from "vitest";

import { computeRpmRepoConfig } from "./repoConfig";

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
