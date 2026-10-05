import { existsSync, readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

function adminPassword(): string {
  if (process.env.PULP_ADMIN_PASSWORD) {
    return process.env.PULP_ADMIN_PASSWORD;
  }
  const match = existsSync(".env")
    ? readFileSync(".env", "utf-8").match(/^PULP_ADMIN_PASSWORD=(.+)$/m)
    : null;
  if (!match?.[1]) {
    throw new Error(
      "PULP_ADMIN_PASSWORD is not set (env var or .env) - see docs/TESTING.md.",
    );
  }
  return match[1].trim();
}

test("the API never triggers the browser's native Basic-auth prompt", async ({
  page,
}) => {
  // Regression check: pulpcore's 401s include "WWW-Authenticate: Basic",
  // which browsers otherwise intercept with their own credential dialog on
  // top of Pulpit's login page - see docs/AUTHENTICATION.md.
  const response = await page.request.get("/pulp/api/v3/login/");
  expect(response.status()).toBe(401);
  expect(response.headers()["www-authenticate"]).toBeUndefined();
});

test("an unauthenticated visitor is redirected to /login", async ({ page }) => {
  await page.goto("/admin?tab=repository-signing");
  await expect(page).toHaveURL(/\/login\?next=/);
  await expect(page.getByRole("heading", { name: "PulpIT", exact: true })).toBeVisible();
});

test("wrong credentials show an error and do not log in", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("definitely-wrong");
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page.getByText(/invalid username or password/i)).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("logging in as admin reaches the app, and logging out returns to /login", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill(adminPassword());
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page.getByRole("heading", { name: "Overview", level: 1 })).toBeVisible();

  await page.getByRole("button", { name: "admin", exact: true }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login/);

  // The session is really gone, not just a client-side redirect.
  await page.goto("/admin?tab=repository-signing");
  await expect(page).toHaveURL(/\/login\?next=/);
});
