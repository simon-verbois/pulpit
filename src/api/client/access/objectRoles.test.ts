import { describe, expect, it } from "vitest";

import { RPM_REPO_FIXTURE } from "../../../test/handlers";
import {
  addObjectRole,
  getObjectMyPermissions,
  listObjectRoles,
  removeObjectRole,
} from "./objectRoles";

describe("generic object-level RBAC adapter", () => {
  it("starts with no roles listed for an object", async () => {
    const result = await listObjectRoles(RPM_REPO_FIXTURE.pulp_href);
    expect(result.roles).toEqual([]);
  });

  it("grants a role to a user on a specific object and lists it back", async () => {
    const granted = await addObjectRole(RPM_REPO_FIXTURE.pulp_href, {
      role: "rpm.rpmrepository_viewer",
      users: ["test-user"],
    });
    expect(granted).toEqual({
      role: "rpm.rpmrepository_viewer",
      users: ["test-user"],
      groups: [],
    });

    const result = await listObjectRoles(RPM_REPO_FIXTURE.pulp_href);
    expect(result.roles).toEqual([
      { role: "rpm.rpmrepository_viewer", users: ["test-user"], groups: [] },
    ]);
  });

  it("revokes a role from a user on a specific object", async () => {
    await addObjectRole(RPM_REPO_FIXTURE.pulp_href, {
      role: "rpm.rpmrepository_viewer",
      users: ["test-user"],
    });

    await removeObjectRole(RPM_REPO_FIXTURE.pulp_href, {
      role: "rpm.rpmrepository_viewer",
      users: ["test-user"],
    });

    const result = await listObjectRoles(RPM_REPO_FIXTURE.pulp_href);
    expect(result.roles).toEqual([]);
  });

  it("returns this session's permissions on an object", async () => {
    const result = await getObjectMyPermissions(RPM_REPO_FIXTURE.pulp_href);
    expect(result.permissions).toEqual([]);
  });
});
