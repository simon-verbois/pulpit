import { expect, test } from "@playwright/test";

const ROUTES = [
  "/rpm/repositories",
  "/rpm/packages",
  "/rpm/advisories",
  "/rpm/remotes",
  "/rpm/alternate-sources",
  "/deb/repositories",
  "/deb/content",
  "/containers/repositories",
  "/containers/tags",
  "/ansible/repositories",
  "/ansible/collections",
  "/ansible/roles",
  "/ansible/remotes",
  "/ansible/search",
  "/files/repositories",
  "/files/content",
  "/gems/repositories",
  "/gems/content",
  "/hugging-face/repositories",
  "/hugging-face/content",
  "/maven/repositories",
  "/maven/content",
  "/npm/repositories",
  "/npm/content",
  "/python/repositories",
  "/python/content",
  "/admin",
  "/admin?tab=access&subtab=users",
  "/admin?tab=access&subtab=groups",
  "/tasks",
];

for (const theme of ["light", "dark"]) {
  test(`primary panels share their top alignment across all sections (${theme})`, async ({
    page,
  }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto("/rpm/repositories");
    const toggle = page.getByRole("button", { name: `Switch to ${theme} theme` });
    if (await toggle.isVisible()) await toggle.click();
    let expectedTop: number | undefined;
    for (const route of ROUTES) {
      await page.goto(route);
      const panel = page.locator(".pulpit-page-panel");
      await expect(panel, route).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const bounds = await panel.boundingBox();
      expect(bounds, route).not.toBeNull();
      expectedTop ??= bounds!.y;
      expect(bounds!.y, route).toBeCloseTo(expectedTop, 1);
    }
  });
}

test("a repository warning cannot remove the tab panel's layout", async ({ page }) => {
  const repository = {
    pulp_href: "/pulp/api/v3/repositories/rpm/rpm/layout-repository/",
    name: "layout-warning",
    description: "",
    versions_href: "/pulp/api/v3/repositories/rpm/rpm/layout-repository/versions/",
    latest_version_href: null,
    remote: null,
    autopublish: false,
  };
  await page.route("**/pulp/api/v3/repositories/rpm/rpm/?**", (route) =>
    route.fulfill({
      json: { count: 1, next: null, previous: null, results: [repository] },
    }),
  );
  let failed = false;
  await page.route("**/pulp/api/v3/tasks/?**", (route) =>
    route.fulfill({
      json: {
        count: failed ? 1 : 0,
        next: null,
        previous: null,
        results: failed
          ? [
              {
                pulp_href: "/pulp/api/v3/tasks/layout-failed-sync/",
                name: "pulp_rpm.app.tasks.synchronizing.synchronize",
                state: "failed",
                finished_at: "2026-10-28T10:00:00Z",
                error: { description: "The upstream source is unavailable." },
              },
            ]
          : [],
      },
    }),
  );
  await page.goto("/rpm/repositories/layout-warning");
  const panel = page.locator(".pulpit-page-panel");
  await expect(panel).toBeVisible();
  const appearance = () =>
    panel.evaluate((element) => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return {
        x: box.x,
        width: box.width,
        margin: style.marginInlineStart,
        background: style.backgroundColor,
        border: style.borderWidth,
        radius: style.borderRadius,
      };
    });
  const before = await appearance();
  failed = true;
  await page.reload();
  await expect(page.getByText(/Last sync failed/)).toBeVisible();
  expect(await appearance()).toEqual(before);
  await expect(page.getByRole("tab", { name: "Versions", exact: true })).toBeVisible();
});
