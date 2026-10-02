import { expect, test } from "@playwright/test";

test.describe("responsive UX conventions", () => {
  test.use({ viewport: { width: 768, height: 900 } });

  test("dense tables stack and long remote URLs stay copyable", async ({ page }) => {
    await page.goto("/rpm/remotes");
    await page.waitForLoadState("networkidle");

    const table = page.getByRole("grid", { name: "RPM remotes" });
    await expect(table).toHaveClass(/pf-m-grid-lg/);
    await expect(
      page.getByRole("button", { name: /^Copy https?:\/\// }).first(),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(
      await page.evaluate(() => document.documentElement.clientWidth),
    );
  });

  test("administration tabs provide an overflow menu when space runs out", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 600, height: 900 });
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("tab", { name: /More administration sections/ }),
    ).toBeVisible();
  });

  test("the proxy form keeps a readable line length", async ({ page }) => {
    await page.goto("/admin?tab=default-settings");
    await page.waitForLoadState("networkidle");

    const width = await page
      .locator(".pulpit-readable-form")
      .evaluate((element) => Math.round(element.getBoundingClientRect().width));
    expect(width).toBeLessThanOrEqual(832);
  });

  test("repository configuration is compact, expandable, and copyable", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/rpm/repositories/pulpit-sample-rpm?tab=distributions");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("button", { name: /Copy .* repository configuration/ }).first(),
    ).toBeVisible();
    const codeBlock = page.locator(".pulpit-copyable-code").first();
    const collapsedBox = await codeBlock.boundingBox();
    const expand = page.getByRole("button", { name: "Show full configuration" }).first();
    await expand.click();
    await expect(page.getByRole("button", { name: "Show less" }).first()).toBeVisible();
    const expandedBox = await codeBlock.boundingBox();

    expect(collapsedBox).not.toBeNull();
    expect(expandedBox).not.toBeNull();
    expect(expandedBox?.x).toBeCloseTo(collapsedBox?.x ?? 0, 1);
    expect(expandedBox?.width).toBeCloseTo(collapsedBox?.width ?? 0, 1);
  });

  test("the development marker is compact while retaining the full timestamp", async ({
    page,
  }) => {
    await page.goto("/");
    const banner = page.locator(".pulpit-dev-banner");

    await expect(banner).toHaveAttribute("title", /^Development build — /);
    await expect(page.locator(".pulpit-dev-banner-date")).toBeHidden();
    await expect(banner).toContainText("Development build");
  });
});
