import { describe, expect, it } from "vitest";

import { getHelpLocationForPath } from "./index";

describe("getHelpLocationForPath", () => {
  it.each([
    ["/", { categoryId: "overview", pageId: "overview" }],
    ["/rpm/repositories", { categoryId: "rpm", pageId: "repositories" }],
    ["/rpm/repositories/test-repo", { categoryId: "rpm", pageId: "repositories" }],
    ["/rpm/packages", { categoryId: "rpm", pageId: "packages" }],
    ["/rpm", { categoryId: "rpm", pageId: "overview" }],
    ["/containers/repositories", { categoryId: "containers", pageId: "repositories" }],
    ["/ansible/collections", { categoryId: "ansible", pageId: "collections" }],
    ["/tasks", { categoryId: "tasks", pageId: "overview" }],
    // Access (Users/Groups/Roles) was folded into Administration too - its
    // detail pages are the one place this category's routes still live
    // outside /admin (AdministrationPage.tsx).
    ["/access/users", { categoryId: "administration", pageId: "users" }],
    ["/access/users/some-user", { categoryId: "administration", pageId: "users" }],
    ["/access/groups/some-group", { categoryId: "administration", pageId: "groups" }],
    // The former standalone admin pages (and Access's own list pages) are
    // tabs on one /admin route now (no distinct URL per tab -
    // AdministrationPage.tsx), so every /admin path falls back to this
    // category's own Overview page; each tab is still manually selectable
    // from Help's own page list regardless.
    ["/admin", { categoryId: "administration", pageId: "overview" }],
    ["/something-unknown", { categoryId: "overview", pageId: "overview" }],
  ])("maps %s to %o", (pathname, expected) => {
    expect(getHelpLocationForPath(pathname)).toEqual(expected);
  });
});
