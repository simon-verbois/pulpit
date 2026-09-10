import { expect, test } from "@playwright/test";

// Unique per run so re-running this spec against a live, already-populated
// dev stack doesn't collide with objects a previous run left behind (same
// convention as e2e/rpm.spec.ts / e2e/access.spec.ts / etc.).
const RUN_ID = Date.now();
const HEADER_GUARD = `e2e-header-guard-${RUN_ID}`;
const RBAC_GUARD = `e2e-rbac-guard-${RUN_ID}`;
const COMPOSITE_GUARD = `e2e-composite-guard-${RUN_ID}`;

test.describe.configure({ mode: "serial" });

test("Administration: TLS exposes only self-signed and manual certificate paths", async ({
  page,
}) => {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));

  await page.setViewportSize({ width: 768, height: 900 });
  // Old bookmarks used subtab=freeipa. They must land on Overview instead
  // of leaving the TLS area blank after that provider's removal.
  await page.goto("/admin?tab=tls&subtab=freeipa");

  await expect(
    page.getByRole("heading", { name: "Administration", level: 1 }),
  ).toBeVisible();
  await expect(page.getByRole("tab", { name: "Overview", exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Overview", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByRole("tab", { name: "Manual", exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "FreeIPA", exact: true })).toHaveCount(0);
  await expect(
    page.getByText(/Self-signed|Manual/, { exact: true }).first(),
  ).toBeVisible();

  await page.getByRole("tab", { name: "Manual", exact: true }).click();
  await page.getByRole("button", { name: "Upload certificate" }).click();
  await expect(page.getByRole("dialog", { name: "Upload certificate" })).toBeVisible();
  await page.keyboard.press("Escape");

  const removedRoute = await page.request.get("/pulpit-core/api/v1/tls/freeipa/settings");
  expect(removedRoute.status()).toBe(404);
  expect(pageErrors).toEqual([]);
});

test.describe("Administration: signing services (read-only) and content guards", () => {
  test("Signing services page loads without crashing", async ({ page }) => {
    // The merged Administration page (docs/adr/0010-merged-administration-
    // page.md) drives its tabs via ?tab=/&subtab= query params, not
    // sub-routes, and its own <h1> is always "Administration" - assert on
    // the Pulp Signing Services sub-tab's own content instead of a
    // page-specific heading. Pulp Signing Services is nested under the
    // Repository Signing tab (it's the read-only inventory of the
    // underlying Pulp SigningService objects Repository Signing's
    // key-generation settings reference by name, not an unrelated concern).
    await page.goto("/admin?tab=repository-signing&subtab=pulp-signing-services");
    await expect(
      page.getByRole("heading", { name: "Administration", level: 1 }),
    ).toBeVisible();
    await expect(page.getByText(/Signing services are read-only here/)).toBeVisible();
    // Read-only - VERIFIED live: no create endpoint exists at all.
    await expect(page.getByRole("button", { name: /create/i })).not.toBeVisible();
  });

  test("exercises the full content guard lifecycle against the live Pulp instance", async ({
    page,
  }) => {
    test.setTimeout(60_000);

    // --- Create a Header guard -----------------------------------------
    await page.goto("/admin?tab=content-guards");
    await page.getByRole("button", { name: "Create content guard" }).click();
    let dialog = page.getByRole("dialog");
    await dialog.locator("#content-guard-name").fill(HEADER_GUARD);
    await dialog.locator("#content-guard-header-name").fill("X-Api-Key");
    await dialog.locator("#content-guard-header-value").fill("secret123");
    await dialog.getByRole("button", { name: "Create" }).click();
    await expect(dialog).not.toBeVisible();
    const row = page.getByRole("row", { name: new RegExp(HEADER_GUARD) });
    await expect(row).toBeVisible();
    await expect(row.getByText("Header", { exact: true })).toBeVisible();

    // --- Edit it -----------------------------------------------------------
    await row.getByRole("button", { name: "Edit" }).click();
    dialog = page.getByRole("dialog");
    await dialog.locator("#content-guard-edit-header-value").fill("rotated-secret");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog).not.toBeVisible();

    // --- Create an RBAC guard and manage its access -------------------------
    await page.getByRole("button", { name: "Create content guard" }).click();
    dialog = page.getByRole("dialog");
    await dialog
      .locator("#content-guard-kind")
      .selectOption({ label: "RBAC - require a granted role (users/groups)" });
    await dialog.locator("#content-guard-name").fill(RBAC_GUARD);
    await dialog.getByRole("button", { name: "Create" }).click();
    await expect(dialog).not.toBeVisible();

    const rbacRow = page.getByRole("row", { name: new RegExp(RBAC_GUARD) });
    await expect(rbacRow).toBeVisible();
    await expect(rbacRow.getByText("RBAC", { exact: true })).toBeVisible();
    await rbacRow.getByRole("button", { name: "Access" }).click();
    const accessDialog = page.getByRole("dialog");
    // Pulp auto-grants the creator (admin) an owner role - VERIFIED live,
    // same pattern as repositories (Milestone 5) - so this is never empty.
    await expect(accessDialog.getByText("core.rbaccontentguard_owner")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(accessDialog).not.toBeVisible();

    // --- Create a Composite guard combining the two above -------------------
    await page.getByRole("button", { name: "Create content guard" }).click();
    dialog = page.getByRole("dialog");
    await dialog
      .locator("#content-guard-kind")
      .selectOption({ label: "Composite - require every one of several other guards" });
    await dialog.locator("#content-guard-name").fill(COMPOSITE_GUARD);
    await dialog.getByLabel(HEADER_GUARD).check();
    await dialog.getByLabel(RBAC_GUARD).check();
    await dialog.getByRole("button", { name: "Create" }).click();
    await expect(dialog).not.toBeVisible();
    await expect(
      page.getByRole("row", { name: new RegExp(COMPOSITE_GUARD) }),
    ).toBeVisible();

    // --- Clean up: composite first (references the other two) ---------------
    for (const guardName of [COMPOSITE_GUARD, RBAC_GUARD, HEADER_GUARD]) {
      const guardRow = page.getByRole("row", { name: new RegExp(guardName) });
      await guardRow.getByRole("button", { name: "Delete" }).click();
      const confirmDialog = page.getByRole("dialog");
      await confirmDialog.getByRole("button", { name: "Delete" }).click();
      await expect(confirmDialog).not.toBeVisible();
      await expect(
        page.getByRole("row", { name: new RegExp(guardName) }),
      ).not.toBeVisible();
    }
  });
});
