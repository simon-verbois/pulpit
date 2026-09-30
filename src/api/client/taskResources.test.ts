import { describe, expect, it } from "vitest";

import { parseResourceRecord, primaryTaskResource, taskResources } from "./taskResources";
import type { PulpTask } from "./tasks";

const DOMAIN = "shared:prn:core.domain:5c55742b-dadb-4451-b5d2-1aa3fd4f0400";

function task(overrides: Partial<PulpTask>): PulpTask {
  return { pulp_href: "/pulp/api/v3/tasks/t/", state: "completed", ...overrides };
}

// Records copied from real pulpcore 3.116 tasks.
describe("parseResourceRecord", () => {
  it("parses PRNs, including a plugin's non-main types", () => {
    expect(parseResourceRecord("prn:rpm.rpmrepository:abc")).toMatchObject({
      by: "prn",
      kind: "repository",
      plugin: "rpm",
      variant: "",
      exclusive: true,
    });
    expect(parseResourceRecord("shared:prn:rpm.ulnremote:abc")).toMatchObject({
      kind: "remote",
      variant: "uln",
      exclusive: false,
    });
    expect(parseResourceRecord("prn:deb.aptrepository:abc")).toMatchObject({
      variant: "",
    });
    expect(
      parseResourceRecord("prn:container.containerpushrepository:abc"),
    ).toMatchObject({ variant: "push" });
  });

  it("maps a repository version href to its repository", () => {
    expect(
      parseResourceRecord("/pulp/api/v3/repositories/ansible/ansible/abc/versions/2/"),
    ).toMatchObject({
      key: "/pulp/api/v3/repositories/ansible/ansible/abc/",
      by: "href",
      kind: "repository",
    });
  });

  it("ignores the domain lock, base-path locks and unavailable records", () => {
    expect(parseResourceRecord(DOMAIN)).toBeNull();
    expect(
      parseResourceRecord(
        "pdrn:5c55742b-dadb-4451-b5d2-1aa3fd4f0400:distribution.base_path",
      ),
    ).toBeNull();
    expect(parseResourceRecord("<unavailable>")).toBeNull();
    expect(parseResourceRecord("/pulp/api/v3/artifacts/abc/")).toBeNull();
  });
});

describe("taskResources", () => {
  it("puts a sync's exclusively-locked repository before its shared remote", () => {
    const sync = task({
      reserved_resources_record: [
        "shared:prn:rpm.rpmremote:remote",
        "prn:rpm.rpmrepository:repo",
        DOMAIN,
      ],
    });
    expect(taskResources(sync).map((ref) => ref.key)).toEqual([
      "prn:rpm.rpmrepository:repo",
      "prn:rpm.rpmremote:remote",
    ]);
  });

  it("falls back to what a create task produced", () => {
    const create = task({
      reserved_resources_record: [DOMAIN],
      created_resources: ["/pulp/api/v3/distributions/ansible/ansible/abc/"],
    });
    expect(primaryTaskResource(create)).toMatchObject({ kind: "distribution" });
  });

  it("has no resource for a domain-wide task", () => {
    expect(
      primaryTaskResource(task({ reserved_resources_record: [DOMAIN] })),
    ).toBeUndefined();
  });
});
