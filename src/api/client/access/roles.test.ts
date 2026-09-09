import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import {
  ACCESS_CUSTOM_ROLE_FIXTURE,
  ACCESS_LOCKED_ROLE_FIXTURE,
} from "../../../test/handlers";
import {
  createRole,
  deleteRole,
  getRoleByName,
  listAllRoles,
  listRoles,
  updateRole,
} from "./roles";

const BASE = "/pulp/api/v3/roles/";

describe("access roles adapter", () => {
  it("lists roles with limit/offset in the query string", async () => {
    let requestedUrl = "";
    server.use(
      http.get(BASE, ({ request }) => {
        requestedUrl = request.url;
        return HttpResponse.json({
          count: 1,
          next: null,
          previous: null,
          results: [ACCESS_CUSTOM_ROLE_FIXTURE],
        });
      }),
    );

    const page = await listRoles({ limit: 10, offset: 0 });

    expect(requestedUrl).toContain("limit=10");
    expect(page.results).toEqual([ACCESS_CUSTOM_ROLE_FIXTURE]);
  });

  it("filters by locked", async () => {
    const page = await listRoles({ limit: 100, offset: 0, locked: true });
    expect(page.results).toEqual([ACCESS_LOCKED_ROLE_FIXTURE]);
  });

  it("looks up a role by exact name", async () => {
    const role = await getRoleByName(ACCESS_CUSTOM_ROLE_FIXTURE.name);
    expect(role).toEqual(ACCESS_CUSTOM_ROLE_FIXTURE);
  });

  it("fetches every page for listAllRoles", async () => {
    server.use(
      http.get(BASE, ({ request }) => {
        const offset = Number(new URL(request.url).searchParams.get("offset"));
        return HttpResponse.json({
          count: 2,
          next: offset === 0 ? `${BASE}?limit=100&offset=1` : null,
          previous: offset === 0 ? null : `${BASE}?limit=100&offset=0`,
          results:
            offset === 0 ? [ACCESS_CUSTOM_ROLE_FIXTURE] : [ACCESS_LOCKED_ROLE_FIXTURE],
        });
      }),
    );

    const roles = await listAllRoles();
    expect(roles).toEqual([ACCESS_CUSTOM_ROLE_FIXTURE, ACCESS_LOCKED_ROLE_FIXTURE]);
  });

  it("creates a role synchronously (VERIFIED live: 201, no task)", async () => {
    const role = await createRole({
      name: "new_role",
      permissions: ["rpm.view_rpmrepository"],
    });
    expect(role.name).toBe("new_role");
    expect(role.locked).toBe(false);
  });

  it("updates an unlocked (custom) role synchronously (VERIFIED live: 200)", async () => {
    const role = await updateRole(ACCESS_CUSTOM_ROLE_FIXTURE.pulp_href, {
      description: "Updated",
    });
    expect(role.description).toBe("Updated");
  });

  it("rejects updating a locked role - VERIFIED live: 403 'The role is locked.'", async () => {
    await expect(
      updateRole(ACCESS_LOCKED_ROLE_FIXTURE.pulp_href, { description: "nope" }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("deletes an unlocked (custom) role synchronously (VERIFIED live: 204)", async () => {
    await expect(
      deleteRole(ACCESS_CUSTOM_ROLE_FIXTURE.pulp_href),
    ).resolves.toBeUndefined();
  });

  it("rejects deleting a locked role - VERIFIED live: 403 'The role is locked.'", async () => {
    await expect(deleteRole(ACCESS_LOCKED_ROLE_FIXTURE.pulp_href)).rejects.toMatchObject({
      status: 403,
    });
  });
});
