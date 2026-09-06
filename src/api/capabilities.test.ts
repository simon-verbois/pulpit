import { describe, expect, it } from "vitest";

import { deriveCapabilities } from "./capabilities";

describe("deriveCapabilities", () => {
  it("derives capabilities from the components Pulp actually reports", () => {
    expect(
      deriveCapabilities({
        versions: [
          { component: "core", version: "3.116.0" },
          { component: "rpm", version: "3.38.5" },
        ],
      }),
    ).toEqual({
      rpm: true,
      container: false,
      ansible: false,
      file: false,
      deb: false,
      python: false,
      npm: false,
      gem: false,
      maven: false,
      hugging_face: false,
    });
  });

  it("never defaults a capability to true when status is unavailable", () => {
    expect(deriveCapabilities(undefined)).toEqual({
      rpm: false,
      container: false,
      ansible: false,
      file: false,
      deb: false,
      python: false,
      npm: false,
      gem: false,
      maven: false,
      hugging_face: false,
    });
  });
});
