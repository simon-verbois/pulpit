import { describe, expect, it } from "vitest";

import { humanizeTaskName } from "./humanizeTaskName";

describe("humanizeTaskName", () => {
  it("drops the pulpcore module path entirely, keeping only the action", () => {
    expect(humanizeTaskName("pulpcore.app.tasks.base.general_create")).toBe(
      "General create",
    );
    expect(humanizeTaskName("pulpcore.app.tasks.orphan.orphan_cleanup")).toBe(
      "Orphan cleanup",
    );
    expect(humanizeTaskName("pulpcore.app.tasks.repository.sync")).toBe("Sync");
    expect(humanizeTaskName("pulpcore.app.tasks.repository.publish")).toBe("Publish");
  });

  it("prefixes a plugin task with its known short label", () => {
    expect(humanizeTaskName("pulp_rpm.app.tasks.publishing.publish")).toBe("RPM publish");
    expect(humanizeTaskName("pulp_rpm.app.tasks.synchronizing.synchronize")).toBe(
      "RPM synchronize",
    );
    expect(humanizeTaskName("pulp_container.app.tasks.tag.tag_image")).toBe(
      "Container tag image",
    );
  });

  it("strips pulpcore's internal 'a' prefix from the async general CRUD tasks", () => {
    expect(humanizeTaskName("pulpcore.app.tasks.base.ageneral_delete")).toBe(
      "General delete",
    );
    expect(humanizeTaskName("pulpcore.app.tasks.base.ageneral_update")).toBe(
      "General update",
    );
  });

  it("falls back to a capitalized plugin name for an unlisted plugin", () => {
    expect(humanizeTaskName("pulp_certguard.app.tasks.cleanup.cleanup")).toBe(
      "Certguard cleanup",
    );
  });

  it("returns the raw string unchanged when it isn't a dotted task path", () => {
    expect(humanizeTaskName("custom-task")).toBe("custom-task");
  });
});
