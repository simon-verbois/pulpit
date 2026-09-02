import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { ACCESS_GROUP_FIXTURE, ACCESS_USER_FIXTURE } from "../../../test/handlers";
import {
  addGroupUser,
  createGroup,
  deleteGroup,
  getGroupByName,
  groupUserId,
  listAllGroups,
  listGroupRoles,
  listGroupUsers,
  listGroups,
  removeGroupUser,
} from "./groups";

const BASE = "/pulp/api/v3/groups/";

describe("access groups adapter", () => {
  it("lists groups with limit/offset in the query string", async () => {
    let requestedUrl = "";
    server.use(
      http.get(BASE, ({ request }) => {
        requestedUrl = request.url;
        return HttpResponse.json({
          count: 1,
          next: null,
          previous: null,
          results: [ACCESS_GROUP_FIXTURE],
        });
      }),
    );

    const page = await listGroups({ limit: 10, offset: 0 });

    expect(requestedUrl).toContain("limit=10");
    expect(page.results).toEqual([ACCESS_GROUP_FIXTURE]);
  });

  it("looks up a group by exact name", async () => {
    const group = await getGroupByName(ACCESS_GROUP_FIXTURE.name);
    expect(group).toEqual(ACCESS_GROUP_FIXTURE);
  });

  it("returns null when no group matches the name", async () => {
    expect(await getGroupByName("does-not-exist")).toBeNull();
  });

  it("fetches every page for listAllGroups", async () => {
    expect(await listAllGroups()).toEqual([ACCESS_GROUP_FIXTURE]);
  });

  it("creates a group synchronously (VERIFIED live: 201, no task)", async () => {
    const group = await createGroup({ name: "new-group" });
    expect(group.name).toBe("new-group");
  });

  it("deletes a group synchronously (VERIFIED live: 204, not 202+task)", async () => {
    await expect(deleteGroup(ACCESS_GROUP_FIXTURE.pulp_href)).resolves.toBeUndefined();
  });

  it("adds a member by username", async () => {
    const member = await addGroupUser(
      ACCESS_GROUP_FIXTURE.pulp_href,
      ACCESS_USER_FIXTURE.username,
    );
    expect(member.username).toBe(ACCESS_USER_FIXTURE.username);
  });

  it("lists a group's members", async () => {
    const page = await listGroupUsers(ACCESS_GROUP_FIXTURE.pulp_href, {
      limit: 10,
      offset: 0,
    });
    expect(page.results).toEqual([]);
  });

  it(
    "derives the numeric user id from a GroupUser's own href - VERIFIED live: it's the user's " +
      "href, not a separate membership-specific one",
    () => {
      expect(groupUserId({ pulp_href: "/pulp/api/v3/users/7/", username: "alice" })).toBe(
        7,
      );
    },
  );

  it(
    "removes a member by the user's numeric id under the group's own users/ sub-collection - " +
      "VERIFIED live, not by username",
    async () => {
      let requestedUrl = "";
      server.use(
        http.delete(`${ACCESS_GROUP_FIXTURE.pulp_href}users/7/`, ({ request }) => {
          requestedUrl = request.url;
          return new HttpResponse(null, { status: 204 });
        }),
      );

      await removeGroupUser(ACCESS_GROUP_FIXTURE.pulp_href, 7);

      expect(requestedUrl).toContain(`${ACCESS_GROUP_FIXTURE.pulp_href}users/7/`);
    },
  );

  it("lists a group's role assignments", async () => {
    const page = await listGroupRoles(ACCESS_GROUP_FIXTURE.pulp_href, {
      limit: 10,
      offset: 0,
    });
    expect(page.results).toEqual([]);
  });
});
