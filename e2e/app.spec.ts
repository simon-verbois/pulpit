import { expect, test } from "@playwright/test";

test("task help explains streaming download inactivity limits", async ({ page }) => {
  await page.goto("/tasks");
  await page.getByRole("button", { name: "Helper" }).click();
  await expect(page.getByText(/Large syncs can run for hours/)).toBeVisible();
  await expect(page.getByText(/Other downloads progressing do not reset/)).toBeVisible();
});

test("task type and state filters combine and survive a reload", async ({ page }) => {
  const tasks = [
    {
      pulp_href: "/pulp/api/v3/tasks/filter-sync/",
      name: "pulp_rpm.app.tasks.synchronizing.synchronize",
      state: "running",
    },
    {
      pulp_href: "/pulp/api/v3/tasks/filter-publish/",
      name: "pulp_rpm.app.tasks.publishing.publish",
      state: "completed",
    },
  ];
  await page.route("**/pulp/api/v3/tasks/?**", (route) => {
    const params = new URL(route.request().url()).searchParams;
    const names = params.get("name__in")?.split(",");
    const state = params.get("state");
    const results = tasks.filter(
      (task) => (!names || names.includes(task.name)) && (!state || task.state === state),
    );
    return route.fulfill({
      json: { count: results.length, next: null, previous: null, results },
    });
  });
  await page.goto("/tasks");
  await page.getByLabel("Filter by task type").selectOption("sync");
  const table = page.getByRole("grid", { name: "Tasks" });
  await expect(table.getByText("Sync", { exact: true })).toBeVisible();
  await expect(table.getByText("Publish", { exact: true })).toHaveCount(0);
  await page.getByLabel("Filter by state").selectOption("running");
  await expect(page).toHaveURL(/type=sync&state=running/);
  await page.reload();
  await expect(page.getByLabel("Filter by task type")).toHaveValue("sync");
  await expect(page.getByLabel("Filter by state")).toHaveValue("running");
  await expect(table.getByText("running", { exact: true })).toBeVisible();
  await page.getByLabel("Filter by task type").selectOption("publish");
  await expect(page.getByText("No matching tasks")).toBeVisible();
});

test("failed task details explain worker loss and disclose technical details", async ({
  page,
}) => {
  const task = {
    pulp_href: "/pulp/api/v3/tasks/e2e-worker-failure/",
    name: "pulp_rpm.app.tasks.synchronizing.synchronize",
    state: "failed",
    error: {
      reason: "Worker has gone missing.",
      traceback: "Worker diagnostic traceback",
    },
    reserved_resources_record: ["prn:rpm.rpmrepository:e2e-repository"],
    created_resources: [],
    logging_cid: "worker-failure-correlation-id",
  };
  await page.route("**/pulp/api/v3/tasks/e2e-worker-failure/", (route) =>
    route.fulfill({ json: task }),
  );
  await page.goto("/tasks?task=e2e-worker-failure");
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Pulp worker stopped responding")).toBeVisible();
  await expect(dialog.getByText(/Check whether Pulp was restarted/)).toBeVisible();
  await expect(dialog.getByText(/This failed sync did not create/)).toBeVisible();
  const technical = dialog.getByRole("button", {
    name: "Technical details",
    exact: true,
  });
  await expect(technical).toHaveAttribute("aria-expanded", "false");
  await expect(dialog.getByText("worker-failure-correlation-id")).not.toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: "Raw resource records" }),
  ).not.toBeVisible();
  await technical.click();
  await expect(dialog.getByText("worker-failure-correlation-id")).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: "Raw resource records" }),
  ).toBeVisible();
  await technical.click();
  const details = dialog.getByRole("button", { name: "Technical error details" });
  await expect(details).toHaveAttribute("aria-expanded", "false");
  await details.click();
  await expect(dialog.getByText(/Worker diagnostic traceback/)).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(dialog.getByText("Pulp worker stopped responding")).toBeVisible();
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
});

test("loads the PulpIT shell", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/PulpIT/);
  await expect(page.getByRole("heading", { name: "Overview", level: 1 })).toBeVisible();
});

test("the PulpIT mark is static and the sidebar stays available", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "PulpIT navigation" });
  const brand = page.locator(".pulpit-brand-lockup");

  await expect(page.locator(".pulpit-brand-text")).toHaveText("PulpIT");
  await expect(brand).toBeVisible();
  await expect(brand.locator("img")).toHaveAttribute("src", "/pulpit-mark.svg");
  await expect(page.getByRole("button", { name: "Toggle navigation" })).toHaveCount(0);
  await expect(nav).toBeVisible();

  await brand.click();
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
  await page.getByRole("button", { name: "Helper" }).click();
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
  await page.getByRole("button", { name: "Helper" }).click();
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
  const rpmRow = components
    .getByText("rpm", { exact: true })
    .locator("xpath=ancestor::tr");
  await expect(rpmRow.getByText(rpm.version, { exact: true })).toBeVisible();
  await expect(components.getByRole("row", { name: /^core\b/ })).toHaveCount(0);
  await expect(
    page.getByText("A snapshot of the Pulp instance PulpIT is managing."),
  ).toHaveCount(0);
  await expect(page.getByText("Connected", { exact: true }).first()).toBeVisible();
  await expect(page.locator(".pf-v6-c-label").first()).toBeVisible();
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

test("a running Pulp task can be stopped from task history", async ({ page }) => {
  let state = "running";
  let cancellationBody: unknown;

  await page.route("**/pulp/api/v3/tasks/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const task = {
      pulp_href: "/pulp/api/v3/tasks/e2e-running/",
      name: "pulpcore.app.tasks.repository.sync",
      state,
      pulp_created: "2026-10-04T07:00:00Z",
      started_at: "2026-10-04T07:00:01Z",
      finished_at: null,
      error: null,
      created_by: null,
      reserved_resources_record: [],
      created_resources: [],
    };

    if (request.method() === "PATCH") {
      cancellationBody = request.postDataJSON();
      state = "canceling";
      await route.fulfill({ json: { ...task, state } });
      return;
    }
    if (request.method() === "GET" && url.pathname === "/pulp/api/v3/tasks/") {
      await route.fulfill({
        json: { count: 1, next: null, previous: null, results: [task] },
      });
      return;
    }
    await route.continue();
  });

  await page.goto("/tasks");
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Stop task?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Stop task" }).click();

  await expect(page.getByText("canceling", { exact: true })).toBeVisible();
  expect(cancellationBody).toEqual({ state: "canceled" });
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Stop", exact: true })).toHaveCount(0);
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
  await expect(html).toHaveCSS("--pulpit-primary", "#2563eb");
  await expect(html).toHaveCSS("--pf-t--global--color--brand--default", "#2563eb");

  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(html).toHaveClass(/pf-v6-theme-dark/);
  await expect(html).toHaveCSS("--pulpit-primary", "#60a5fa");
  await expect(html).toHaveCSS("--pf-t--global--color--brand--default", "#60a5fa");

  await page.reload();
  await expect(html).toHaveClass(/pf-v6-theme-dark/);

  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await expect(html).not.toHaveClass(/pf-v6-theme-dark/);
});

test("switching theme preserves the shell and Overview geometry", async ({ page }) => {
  await page.setViewportSize({ width: 2048, height: 1106 });
  await page.goto("/");
  await expect(
    page
      .locator(".pulpit-dashboard-panel .pf-v6-c-table__tbody .pf-v6-c-table__tr")
      .first(),
  ).toBeVisible();

  const selectors = [
    ".pf-v6-c-page__sidebar",
    ".pf-v6-c-page__main-container",
    ".pulpit-overview-header",
    ".pulpit-metric-gallery",
    ".pulpit-dashboard-panel",
  ];
  const boxes = () =>
    Promise.all(
      selectors.map((selector) => page.locator(selector).first().boundingBox()),
    );

  const lightBoxes = await boxes();
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator("html")).toHaveClass(/pf-v6-theme-dark/);
  const darkBoxes = await boxes();

  for (let index = 0; index < selectors.length; index += 1) {
    expect(lightBoxes[index]).not.toBeNull();
    expect(darkBoxes[index]).not.toBeNull();
    expect(darkBoxes[index]?.x).toBeCloseTo(lightBoxes[index]?.x ?? 0, 1);
    expect(darkBoxes[index]?.y).toBeCloseTo(lightBoxes[index]?.y ?? 0, 1);
    expect(darkBoxes[index]?.width).toBeCloseTo(lightBoxes[index]?.width ?? 0, 1);
    expect(darkBoxes[index]?.height).toBeCloseTo(lightBoxes[index]?.height ?? 0, 1);
  }
});
