import { existsSync, readFileSync } from "node:fs";
import { test as setup, expect } from "@playwright/test";

const AUTH_STATE_PATH = "playwright/.auth/admin.json";

// Playwright doesn't load .env itself; read PULP_ADMIN_PASSWORD from it if
// the environment doesn't already have one set (e.g. exported in CI).
function loadAdminPassword(): string {
  if (process.env.PULP_ADMIN_PASSWORD) {
    return process.env.PULP_ADMIN_PASSWORD;
  }
  if (existsSync(".env")) {
    const match = readFileSync(".env", "utf-8").match(/^PULP_ADMIN_PASSWORD=(.+)$/m);
    if (match?.[1]) {
      return match[1].trim();
    }
  }
  throw new Error(
    "PULP_ADMIN_PASSWORD is not set (env var or .env). The e2e suite logs in as " +
      "the Pulp admin account to exercise authenticated routes - see docs/TESTING.md.",
  );
}

setup("authenticate as the Pulp admin account", async ({ page }) => {
  const password = loadAdminPassword();

  await page.goto("/login");
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page.getByRole("heading", { name: "Overview", level: 1 })).toBeVisible();
  await page.context().storageState({ path: AUTH_STATE_PATH });
});
