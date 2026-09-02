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
    ["/access/users", { categoryId: "access", pageId: "users" }],
    ["/admin/status", { categoryId: "administration", pageId: "status" }],
    [
      "/admin/repository-signing",
      { categoryId: "administration", pageId: "repository-signing" },
    ],
    ["/admin/signing", { categoryId: "administration", pageId: "signing" }],
    ["/admin/content-guards", { categoryId: "administration", pageId: "content-guards" }],
    ["/admin", { categoryId: "administration", pageId: "overview" }],
    ["/something-unknown", { categoryId: "overview", pageId: "overview" }],
  ])("maps %s to %o", (pathname, expected) => {
    expect(getHelpLocationForPath(pathname)).toEqual(expected);
  });
});
