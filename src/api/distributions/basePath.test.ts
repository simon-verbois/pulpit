import { describe, expect, it } from "vitest";

import { buildDistributionBasePath, distributionPathPrefix } from "./basePath";

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
});
