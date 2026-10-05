import { expect, test } from "@playwright/test";

for (const view of [
  {
    path: "/rpm/repositories",
    api: "**/pulp/api/v3/repositories/rpm/rpm/?*",
    loading: "Loading repositories",
    table: "RPM repositories",
    columns: ["Name", "Description", "Size", "Actions"],
  },
  {
    path: "/admin?tab=access&subtab=users",
    api: "**/pulp/api/v3/users/?*",
    loading: "Loading users",
    table: "Users",
    columns: ["Username", "Name", "Email", "Status", "Actions"],
  },
  {
    path: "/tasks",
    api: "**/pulp/api/v3/tasks/?*",
    loading: "Loading tasks",
    table: "Tasks",
    columns: [
      "Task",
      "Resource",
      "State",
      "Created by",
      "Created",
      "Duration",
      "Actions",
    ],
  },
]) {
  test(`${view.table} keeps its column layout during a slow first load`, async ({
    page,
  }) => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(view.api, async (route) => {
      await pending;
      await route.continue();
    });
    try {
      await page.goto(view.path);
      const placeholder = page.getByRole("grid", { name: view.loading });
      await expect(placeholder).toBeVisible();
      await expect(placeholder).toHaveAttribute("aria-busy", "true");
      await expect(placeholder.getByRole("columnheader")).toHaveText(view.columns);
      await expect(placeholder.getByRole("button")).toHaveCount(0);
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(placeholder).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await page.setViewportSize({ width: 1280, height: 900 });
      release();
      await expect(placeholder).toHaveCount(0);
      await expect(
        page.getByRole("grid", { name: view.table, exact: true }),
      ).toBeVisible();
    } finally {
      release();
    }
  });
}

test("a failed list request replaces placeholders with an error", async ({ page }) => {
  await page.route("**/pulp/api/v3/users/?*", (route) =>
    route.fulfill({
      status: 403,
      json: { detail: "You do not have permission to perform this action." },
    }),
  );
  await page.goto("/admin?tab=access&subtab=users");
  await expect(page.getByRole("grid", { name: "Loading users" })).toHaveCount(0);
  await expect(page.getByText(/permission|forbidden/i).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry", exact: true })).toBeVisible();
});
