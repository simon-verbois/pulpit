import { expect, test } from "@playwright/test";

test("loads the PulpIT shell", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/PulpIT/);
  await expect(page.getByRole("heading", { name: "Overview", level: 1 })).toBeVisible();
});

test("primary navigation reaches the major sections", async ({ page }) => {
  await page.goto("/");
  // Scoped to the sidebar landmark: the masthead also has a "Tasks" link
  // (TasksIndicator), so an unscoped locator would be ambiguous.
  const nav = page.getByRole("navigation", { name: "PulpIT navigation" });

  // "Administration" and "Access" are collapsible NavExpandable groups
  // (docs/UX.md) - their items aren't in the accessibility tree until expanded.
  await nav.getByRole("button", { name: "Administration" }).click();
  await nav.getByRole("link", { name: "Content guards" }).click();
  await expect(page).toHaveURL(/\/admin\/content-guards$/);
  await expect(
    page.getByRole("heading", { name: "Content guards", level: 1 }),
  ).toBeVisible();

  await nav.getByRole("link", { name: "Tasks" }).click();
  await expect(page).toHaveURL(/\/tasks$/);

  await nav.getByRole("button", { name: "Access" }).click();
  await nav.getByRole("link", { name: "Users" }).click();
  await expect(page).toHaveURL(/\/access\/users$/);
});

test("clicking elsewhere in the app closes an open Tasks or Help panel", async ({
  page,
}) => {
  await page.goto("/");
  const helpHeading = page.getByRole("heading", { name: "Help", exact: true });
  const tasksHeading = page.getByRole("heading", { name: "Tasks", exact: true });

  // Help: open it, then click the main content area (not the close button,
  // not the Help/Tasks toggle buttons themselves) - it should close.
  await page.getByRole("button", { name: "Help" }).click();
  await expect(helpHeading).toBeVisible();
  await page.getByRole("main", { name: "Main content" }).click();
  await expect(helpHeading).not.toBeVisible();

  // Tasks: same, clicking the sidebar nav this time.
  await page.getByRole("button", { name: /Tasks/ }).click();
  await expect(tasksHeading).toBeVisible();
  await page.getByRole("navigation", { name: "PulpIT navigation" }).click();
  await expect(tasksHeading).not.toBeVisible();

  // Clicking the OTHER toggle button while one is open must still just
  // switch panels normally, not be swallowed by the outside-click handler.
  await page.getByRole("button", { name: "Help" }).click();
  await expect(helpHeading).toBeVisible();
  await page.getByRole("button", { name: /Tasks/ }).click();
  await expect(tasksHeading).toBeVisible();
  await expect(helpHeading).not.toBeVisible();
});

test("Overview page reaches the real Pulp status endpoint", async ({ page }) => {
  const response = await page.request.get("/pulp/api/v3/status/");
  expect(response.ok()).toBeTruthy();

  await page.goto("/");
  // Every Pulp status response reports at least the core component's version.
  await expect(page.getByText("core")).toBeVisible();
  // VERIFIED live: this dev instance's pulpcore/pulp_rpm/pulp_ansible/
  // pulp_container versions match src/lib/pulpCompatibility.ts's baseline
  // exactly, so core's row should read as a match.
  const coreRow = page.getByRole("row", { name: /^core/ });
  await expect(coreRow.getByText(/Matches verified/)).toBeVisible();
});

test("Tasks page shows Pulp's real task history, not just this session's", async ({
  page,
}) => {
  await page.goto("/tasks");
  await expect(page.getByRole("heading", { name: "Tasks", level: 1 })).toBeVisible();
  const rows = page.locator("table tbody tr");
  // The dev Pulp instance already has a large real task history from every
  // other e2e spec run against it - this page must show that, not an
  // empty/session-only list.
  await expect(rows.first()).toBeVisible();

  await page.getByLabel("Filter by state").selectOption("completed");
  const tableBody = page.locator("table tbody");
  await expect(tableBody.getByText("completed", { exact: true }).first()).toBeVisible();
  await expect(tableBody.getByText("failed", { exact: true })).not.toBeVisible();

  await rows.first().getByRole("button", { name: "View details" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("State")).toBeVisible();
  await expect(dialog.getByText("Created by")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});

test("legacy pulp-ui path is not exposed", async ({ page }) => {
  const response = await page.goto("/ui/");
  expect(response?.status()).toBe(404);
});

test("the theme toggle switches dark/light and persists across a reload", async ({
  page,
}) => {
  await page.goto("/");
  const html = page.locator("html");
  // Dark is Pulpit's default (docs/UX.md "Theming") - toggling to light and
  // back exercises both the class and the persisted preference either way.
  await expect(html).toHaveClass(/pf-v6-theme-dark/);

  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await expect(html).not.toHaveClass(/pf-v6-theme-dark/);

  await page.reload();
  await expect(html).not.toHaveClass(/pf-v6-theme-dark/);

  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(html).toHaveClass(/pf-v6-theme-dark/);
});
