import { expect, test } from "@playwright/test";

test.describe("responsive UX conventions", () => {
  test.use({ viewport: { width: 768, height: 900 } });

  test("sidebar and masthead icons are visually centered with their labels", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 2048, height: 1106 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const navLink = page
      .getByRole("navigation", { name: "PulpIT navigation" })
      .getByRole("link", { name: "Overview", exact: true });
    const [navIconBox, navTextBox] = await Promise.all([
      navLink.locator(".pf-v6-c-nav__link-icon").boundingBox(),
      navLink.locator(".pf-v6-c-nav__link-text").boundingBox(),
    ]);
    expect(navIconBox).not.toBeNull();
    expect(navTextBox).not.toBeNull();
    const navIconCenter = (navIconBox?.y ?? 0) + (navIconBox?.height ?? 0) / 2;
    const navTextCenter = (navTextBox?.y ?? 0) + (navTextBox?.height ?? 0) / 2;
    expect(navIconCenter).toBeCloseTo(navTextCenter, 0);

    const actions = [
      page.getByRole("button", { name: /Tasks/ }),
      page.getByRole("button", { name: "Helper" }),
      page.getByRole("button", { name: /Switch to (dark|light) theme/ }),
      page.getByRole("button", { name: "admin" }),
    ];
    const actionBoxes = await Promise.all(actions.map((action) => action.boundingBox()));
    expect(actionBoxes.every(Boolean)).toBe(true);
    const actionCenters = actionBoxes.map(
      (box) => (box?.y ?? 0) + (box?.height ?? 0) / 2,
    );
    for (const center of actionCenters.slice(1)) {
      expect(center).toBeCloseTo(actionCenters[0], 0);
    }
    for (let index = 1; index < actionBoxes.length; index += 1) {
      const previous = actionBoxes[index - 1];
      const current = actionBoxes[index];
      expect(
        (current?.x ?? 0) - ((previous?.x ?? 0) + (previous?.width ?? 0)),
      ).toBeGreaterThanOrEqual(8);
    }

    const actionStyles = await Promise.all(
      actions.map((action) =>
        action.evaluate((element) => {
          const style = getComputedStyle(element);
          return {
            background: style.backgroundColor,
            borderRadius: Number.parseFloat(style.borderRadius),
            borderStyle: style.borderTopStyle,
          };
        }),
      ),
    );
    for (const style of actionStyles) {
      expect(style.background).not.toBe("rgba(0, 0, 0, 0)");
      expect(style.borderRadius).toBeGreaterThanOrEqual(7);
      expect(style.borderStyle).toBe("solid");
    }

    const [themeIconBox, helperTextBox, brandIconBox, brandTextBox] = await Promise.all([
      actions[2].locator("svg").boundingBox(),
      actions[1].locator(".pf-v6-c-button__text").boundingBox(),
      page.locator(".pulpit-brand-lockup img").boundingBox(),
      page.locator(".pulpit-brand-text").boundingBox(),
    ]);
    expect(themeIconBox).not.toBeNull();
    expect(helperTextBox).not.toBeNull();
    expect(brandIconBox).not.toBeNull();
    expect(brandTextBox).not.toBeNull();
    expect((themeIconBox?.y ?? 0) + (themeIconBox?.height ?? 0) / 2).toBeCloseTo(
      (helperTextBox?.y ?? 0) + (helperTextBox?.height ?? 0) / 2,
      0,
    );
    expect((brandIconBox?.y ?? 0) + (brandIconBox?.height ?? 0) / 2).toBeCloseTo(
      (brandTextBox?.y ?? 0) + (brandTextBox?.height ?? 0) / 2,
      0,
    );

    await expect(page.getByRole("link", { name: /Pulp API documentation/ })).toHaveCount(
      0,
    );
    await expect(actions[1].locator("svg")).toHaveCount(0);
    await expect(actions[3].locator("svg")).toHaveCount(0);
  });

  test("Overview metrics and data panels remain usable at narrow widths", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 600, height: 900 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(page.locator(".pulpit-metric-card").first()).toBeVisible();
    await expect(page.getByRole("grid", { name: "Pulp components" })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(
      await page.evaluate(() => document.documentElement.clientWidth),
    );
  });

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

  test("pagination derives its default page size from viewport height", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1037 });
    const initialUsersRequest = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        url.pathname === "/pulp/api/v3/users/" && url.searchParams.get("limit") === "13"
      );
    });

    await page.goto("/admin?tab=access&subtab=users");
    await initialUsersRequest;

    const resizedUsersRequest = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        url.pathname === "/pulp/api/v3/users/" && url.searchParams.get("limit") === "22"
      );
    });
    await page.setViewportSize({ width: 1440, height: 1440 });
    await resizedUsersRequest;
  });

  test("the proxy settings adapt from three columns to one", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/admin?tab=default-settings");
    await page.waitForLoadState("networkidle");

    const connection = page.getByRole("heading", { name: "Connection", level: 3 });
    const authentication = page.getByRole("heading", {
      name: "Authentication",
      level: 3,
    });
    const trust = page.getByRole("heading", { name: "Trust", level: 3 });

    const desktopBoxes = await Promise.all([
      connection.boundingBox(),
      authentication.boundingBox(),
      trust.boundingBox(),
    ]);
    expect(desktopBoxes.every(Boolean)).toBe(true);
    expect(desktopBoxes[0]?.y).toBeCloseTo(desktopBoxes[1]?.y ?? 0, 0);
    expect(desktopBoxes[1]?.y).toBeCloseTo(desktopBoxes[2]?.y ?? 0, 0);

    await page.setViewportSize({ width: 900, height: 900 });
    const mediumBoxes = await Promise.all([
      connection.boundingBox(),
      authentication.boundingBox(),
      trust.boundingBox(),
    ]);
    expect(mediumBoxes.every(Boolean)).toBe(true);
    expect(mediumBoxes[0]?.y).toBeCloseTo(mediumBoxes[1]?.y ?? 0, 0);
    expect(mediumBoxes[2]?.y ?? 0).toBeGreaterThan(mediumBoxes[0]?.y ?? 0);

    await page.setViewportSize({ width: 600, height: 900 });
    const narrowBoxes = await Promise.all([
      connection.boundingBox(),
      authentication.boundingBox(),
      trust.boundingBox(),
    ]);
    expect(narrowBoxes.every(Boolean)).toBe(true);
    expect(narrowBoxes[0]?.x).toBeCloseTo(narrowBoxes[1]?.x ?? 0, 0);
    expect(narrowBoxes[1]?.x).toBeCloseTo(narrowBoxes[2]?.x ?? 0, 0);
    expect(narrowBoxes[1]?.y ?? 0).toBeGreaterThan(narrowBoxes[0]?.y ?? 0);
    expect(narrowBoxes[2]?.y ?? 0).toBeGreaterThan(narrowBoxes[1]?.y ?? 0);
  });

  test("LDAP group and attribute settings stay visible without a disclosure", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 2048, height: 1106 });
    await page.goto("/admin?tab=access&subtab=ldap");
    await page.waitForLoadState("networkidle");

    const groupLookup = page.getByRole("heading", { name: "Group lookup", level: 3 });
    const attributeMapping = page.getByRole("heading", {
      name: "Attribute mapping",
      level: 3,
    });
    await expect(groupLookup).toBeVisible();
    await expect(attributeMapping).toBeVisible();
    await expect(page.getByRole("button", { name: /advanced settings/i })).toHaveCount(0);
    const mainSize = await page.getByRole("main").evaluate((element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
    }));
    expect(mainSize.scrollHeight).toBeLessThanOrEqual(mainSize.clientHeight);

    const desktopGroupBox = await groupLookup.boundingBox();
    const desktopAttributeBox = await attributeMapping.boundingBox();
    expect(desktopGroupBox?.y).toBeCloseTo(desktopAttributeBox?.y ?? 0, 0);

    await page.setViewportSize({ width: 600, height: 900 });
    const narrowGroupBox = await groupLookup.boundingBox();
    const narrowAttributeBox = await attributeMapping.boundingBox();
    expect(narrowAttributeBox?.y ?? 0).toBeGreaterThan(narrowGroupBox?.y ?? 0);
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
