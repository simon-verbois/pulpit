import { describe, expect, it } from "vitest";

import {
  buildDistributionBasePath,
  buildVersionedDistributionName,
  distributionPathPrefix,
} from "./basePath";

describe("distribution base-path policy", () => {
  it("uses the public module namespace as a fixed prefix", () => {
    expect(distributionPathPrefix("rpm")).toBe("rpm/");
    expect(distributionPathPrefix("huggingFace")).toBe("hugging-face/");
  });

  it("builds a scoped base path from the user-controlled suffix", () => {
    expect(buildDistributionBasePath("container", "team/image")).toBe(
      "container/team/image",
    );
  });

  it("derives stable names for latest and version-pinned distributions", () => {
    expect(buildVersionedDistributionName("my-repo")).toBe("my-repo");
    expect(buildVersionedDistributionName("my-repo", 0)).toBe("my-repo-v0");
    expect(buildVersionedDistributionName("my-repo", 12)).toBe("my-repo-v12");
  });
});
