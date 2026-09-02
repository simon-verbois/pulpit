import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { ACCESS_USER_FIXTURE } from "../../../test/handlers";
import {
  assignUserRole,
  createUser,
  deleteUser,
  getUser,
  getUserByUsername,
  listAllUsers,
  listUserRoles,
  listUsers,
  unassignUserRole,
  updateUser,
} from "./users";

const BASE = "/pulp/api/v3/users/";

describe("access users adapter", () => {
  it("lists users with limit/offset in the query string", async () => {
    let requestedUrl = "";
    server.use(
      http.get(BASE, ({ request }) => {
        requestedUrl = request.url;
        return HttpResponse.json({
          count: 1,
          next: null,
          previous: null,
          results: [ACCESS_USER_FIXTURE],
        });
      }),
    );

    const page = await listUsers({ limit: 10, offset: 0 });

    expect(requestedUrl).toContain("limit=10");
    expect(page.results).toEqual([ACCESS_USER_FIXTURE]);
  });

  it("looks up a user by exact username and returns the first result", async () => {
    const user = await getUserByUsername(ACCESS_USER_FIXTURE.username);
    expect(user).toEqual(ACCESS_USER_FIXTURE);
  });

  it("fetches a user directly by its own href", async () => {
    const user = await getUser(ACCESS_USER_FIXTURE.pulp_href);
    expect(user).toEqual(ACCESS_USER_FIXTURE);
  });

  it("returns null (not undefined) when no user matches the username", async () => {
    const user = await getUserByUsername("does-not-exist");
    expect(user).toBeNull();
  });

  it("fetches every page for listAllUsers", async () => {
    const users = await listAllUsers();
    expect(users).toEqual([ACCESS_USER_FIXTURE]);
  });

  it("creates a user synchronously (VERIFIED live: 201, no task)", async () => {
    const user = await createUser({ username: "new-user", password: "secret" });
    expect(user.username).toBe("new-user");
  });

  it("updates a user synchronously (VERIFIED live: 200, not 202+task)", async () => {
    const user = await updateUser(ACCESS_USER_FIXTURE.pulp_href, { first_name: "Ada" });
    expect(user.first_name).toBe("Ada");
  });

  it("deletes a user synchronously (VERIFIED live: 204, not 202+task)", async () => {
    await expect(deleteUser(ACCESS_USER_FIXTURE.pulp_href)).resolves.toBeUndefined();
  });

  it("assigns a role to a user, requiring content_object to be sent explicitly", async () => {
    let requestBody: unknown;
    server.use(
      http.post(`${ACCESS_USER_FIXTURE.pulp_href}roles/`, async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json(
          {
            pulp_href: `${ACCESS_USER_FIXTURE.pulp_href}roles/1/`,
            role: "core.task_owner",
            content_object: null,
            content_object_prn: null,
            description: null,
            permissions: [],
          },
          { status: 201 },
        );
      }),
    );

    const assignment = await assignUserRole(ACCESS_USER_FIXTURE.pulp_href, {
      role: "core.task_owner",
      content_object: null,
    });

    expect(requestBody).toEqual({ role: "core.task_owner", content_object: null });
    expect(assignment.role).toBe("core.task_owner");
  });

  it("lists a user's role assignments", async () => {
    const page = await listUserRoles(ACCESS_USER_FIXTURE.pulp_href, {
      limit: 10,
      offset: 0,
    });
    expect(page.results).toEqual([]);
  });

  it("unassigns a role synchronously (204)", async () => {
    await expect(
      unassignUserRole(`${ACCESS_USER_FIXTURE.pulp_href}roles/1/`),
    ).resolves.toBeUndefined();
  });
});
