import { expect, test } from "@playwright/test";

test("loads the PulpIT shell", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/PulpIT/);
  await expect(page.getByRole("heading", { name: "Overview", level: 1 })).toBeVisible();
});

test("the PulpIT mark toggles the sidebar", async ({ page }) => {
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Toggle navigation" });
  const nav = page.getByRole("navigation", { name: "PulpIT navigation" });

  await expect(page.locator(".pulpit-brand-text")).toHaveText("PulpIT");
  await expect(toggle).not.toContainText("PulpIT");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(nav).toBeVisible();

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(nav).not.toBeVisible();

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(nav).toBeVisible();
});

test("primary navigation reaches the major sections", async ({ page }) => {
  await page.goto("/");
  // Scoped to the sidebar landmark: the masthead also has a "Tasks" link
  // (TasksIndicator), so an unscoped locator would be ambiguous.
  const nav = page.getByRole("navigation", { name: "PulpIT navigation" });

  await nav.getByRole("link", { name: "Administration", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Administration", level: 1 }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Content guards", exact: true }).click();
  await expect(page).toHaveURL(/tab=content-guards/);
  await expect(page.getByRole("grid", { name: "Content guards" })).toBeVisible();

  await nav.getByRole("link", { name: "Tasks", exact: true }).click();
  await expect(page).toHaveURL(/\/tasks$/);

  await nav.getByRole("link", { name: "Administration", exact: true }).click();
  await page.getByRole("tab", { name: "Access", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Users", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByRole("grid", { name: "Users", exact: true })).toBeVisible();
});

test("clicking elsewhere in the app closes an open Tasks or Help panel", async ({
  page,
}) => {
  await page.goto("/");
  const helpHeading = page.getByRole("heading", { name: "Help", exact: true });
  const tasksHeading = page.getByRole("heading", { name: "Tasks", exact: true });

  // Help: open it, then click the sidebar (not the close button, not the
  // Help/Tasks toggle buttons themselves) - it should close. The drawer can
  // overlay the main area at narrower desktop widths.
  await page.getByRole("button", { name: "Help" }).click();
  await expect(helpHeading).toBeVisible();
  await page.getByRole("navigation", { name: "PulpIT navigation" }).click();
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
  const status = await response.json();
  const components = page.getByRole("grid", { name: "Pulp components" });
  await expect(components).toBeVisible();
  const rpm = status.versions.find(
    (component: { component: string }) => component.component === "rpm",
  );
  const rpmRow = components.getByRole("row", { name: /^rpm\b/ });
  await expect(rpmRow.getByText(rpm.version, { exact: true })).toBeVisible();
  await expect(components.getByRole("row", { name: /^core\b/ })).toHaveCount(0);
  await expect(
    page.getByText("A snapshot of the Pulp instance PulpIT is managing."),
  ).toHaveCount(0);
  await expect(page.locator(".pf-v6-c-label, .pf-v6-c-badge")).toHaveCount(0);
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
  // Light is Pulpit's default (docs/UX.md "Theming") - toggling to dark and
  // back exercises both the class and the persisted preference either way.
  await expect(html).not.toHaveClass(/pf-v6-theme-dark/);

  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(html).toHaveClass(/pf-v6-theme-dark/);

  await page.reload();
  await expect(html).toHaveClass(/pf-v6-theme-dark/);

  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await expect(html).not.toHaveClass(/pf-v6-theme-dark/);
});
