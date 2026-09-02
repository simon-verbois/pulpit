import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Automated WCAG scanning across every static route in the app, in both
// themes (contrast rules differ per theme - see ADR/UX docs for the theme
// toggle). This complements eslint-plugin-jsx-a11y (which only sees JSX
// source, not PatternFly's rendered/computed DOM) and manual keyboard/focus
// checks that no automated tool catches (see a11y.spec.ts's dedicated tests
// below).
const ROUTES = [
  "/",
  "/rpm/repositories",
  "/rpm/packages",
  "/rpm/advisories",
  "/rpm/remotes",
  "/rpm/alternate-sources",
  "/containers/repositories",
  "/containers/tags",
  "/containers/remotes",
  "/ansible/repositories",
  "/ansible/collections",
  "/ansible/roles",
  "/ansible/remotes",
  "/ansible/namespaces",
  "/ansible/search",
  "/tasks",
  "/access/users",
  "/access/groups",
  "/access/roles",
  "/admin/status",
  "/admin/repository-signing",
  "/admin/signing",
  "/admin/content-guards",
];

async function scan(page: Page, path: string) {
  await page.goto(path);
  // Let the page settle past its loading state before scanning - axe on a
  // spinner-only DOM would miss most of the real content.
  await page.waitForLoadState("networkidle");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  return results.violations;
}

for (const path of ROUTES) {
  test(`a11y: ${path} has no WCAG 2.1 AA violations (light theme)`, async ({ page }) => {
    const violations = await scan(page, path);
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });
}

async function scanCurrentPage(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  return results.violations;
}

test("a11y: dark theme has no WCAG 2.1 AA violations on a representative page", async ({
  page,
}) => {
  await page.goto("/rpm/repositories");
  await page.waitForLoadState("networkidle");
  const themeButton = page.getByRole("button", { name: /Switch to (dark|light) theme/ });
  if (
    await themeButton.getAttribute("aria-label").then((label) => label?.includes("dark"))
  ) {
    await themeButton.click();
  }
  const violations = await scanCurrentPage(page);
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
});

test("a11y: login page has no WCAG 2.1 AA violations", async ({ page }) => {
  // The chromium project's storageState is already authenticated, so force
  // a logged-out context by clearing storage before visiting /login.
  await page.context().clearCookies();
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  const violations = await scanCurrentPage(page);
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
});

test("a11y: Create Repository modal (RPM) has no WCAG 2.1 AA violations", async ({
  page,
}) => {
  await page.goto("/rpm/repositories");
  await page.getByRole("button", { name: "Create repository" }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const violations = await scanCurrentPage(page);
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
});

test("a11y: Help panel has no WCAG 2.1 AA violations", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("nav");
  await page.getByRole("button", { name: "Help" }).click();
  await expect(page.getByRole("heading", { name: "Help", exact: true })).toBeVisible();
  const violations = await scanCurrentPage(page);
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
});

test.describe("keyboard operability", () => {
  test("a modal traps focus and Escape closes it, returning focus to the trigger", async ({
    page,
  }) => {
    await page.goto("/rpm/repositories");
    const trigger = page.getByRole("button", { name: "Create repository" }).first();
    await trigger.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Focus should have moved into the dialog, not stayed on the page body.
    await expect(dialog.locator(":focus")).toHaveCount(1);

    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    // Focus should return to the button that opened it, not get lost on <body>.
    await expect(trigger).toBeFocused();
  });

  test("the skip link is the first focusable element and jumps to main content", async ({
    page,
  }) => {
    await page.goto("/");
    // Wait past the initial "checking your Pulp session" spinner - pressing
    // Tab too early lands on <body>, not the real first focusable element.
    await page.waitForSelector("nav");
    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", { name: /skip to (main )?content/i });
    await expect(skipLink).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#pulpit-main-content")).toBeFocused();
  });

  test("the Tasks drawer opens, is keyboard-dismissible, and returns focus", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForSelector("nav");
    const tasksButton = page.getByRole("button", { name: "Tasks" });
    await tasksButton.click();
    await expect(page.getByRole("heading", { name: "Tasks", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("heading", { name: "Tasks", exact: true }),
    ).not.toBeVisible();
    await expect(tasksButton).toBeFocused();
  });

  test("the Help panel opens, is keyboard-dismissible, and returns focus", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForSelector("nav");
    const helpButton = page.getByRole("button", { name: "Help" });
    await helpButton.click();
    await expect(page.getByRole("heading", { name: "Help", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("heading", { name: "Help", exact: true }),
    ).not.toBeVisible();
    await expect(helpButton).toBeFocused();
  });
});
