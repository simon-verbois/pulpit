import { expect, test } from "@playwright/test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Real fixture RPM (a handful of KB), checked into the repo so this spec
// doesn't depend on network access to fixtures.pulpproject.org for the
// upload step (sync, below, still exercises that remote source for real).
const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_RPM_PATH = join(__dirname, "fixtures", "walrus-5.21-1.noarch.rpm");

// Unique per run so re-running this spec against a live, already-populated
// dev stack doesn't collide with objects a previous run left behind.
const RUN_ID = Date.now();
const REMOTE_NAME = `e2e-remote-${RUN_ID}`;
const REPO_NAME = `e2e-repo-${RUN_ID}`;
const DIST_BASE_PATH = `rpm/${REPO_NAME}`;
const PINNED_DIST_NAME = `${REPO_NAME}-v1`;
const ULN_REMOTE_NAME = `e2e-uln-remote-${RUN_ID}`;

test.describe.configure({ mode: "serial" });

test.describe("RPM: remote -> repository -> sync -> packages -> versions -> upload -> distribution", () => {
  test("exercises the full RPM content lifecycle against the live Pulp instance", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    // --- Create a remote -------------------------------------------------
    await page.goto("/rpm/remotes");
    await page.getByRole("button", { name: "Create remote" }).first().click();
    await page.locator("#remote-name").fill(REMOTE_NAME);
    await page
      .locator("#remote-url")
      .fill("https://fixtures.pulpproject.org/rpm-unsigned/");
    await page.getByRole("dialog").getByRole("button", { name: "Create" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(page.getByText(REMOTE_NAME)).toBeVisible();

    // --- Create a repository pointed at that remote -----------------------
    await page.goto("/rpm/repositories");
    await page.getByRole("button", { name: "Create repository" }).first().click();
    await page.locator("#repository-name").fill(REPO_NAME);
    await page.locator("#repository-remote").selectOption({ label: REMOTE_NAME });
    // This scenario exercises the repository-detail creation flow below, so
    // don't also create the same automatically named distribution here.
    await page.getByLabel("Create a distribution for this repository").uncheck();
    await page.getByRole("dialog").getByRole("button", { name: "Create" }).click();

    // Synchronous create (VERIFIED: 201, no task) navigates straight to the
    // new repository's detail page.
    await expect(page).toHaveURL(new RegExp(`/rpm/repositories/${REPO_NAME}$`));
    await expect(page.getByRole("heading", { name: REPO_NAME })).toBeVisible();

    // --- Sync it and wait for the tracked task to complete ----------------
    const syncButton = page.getByRole("button", { name: "Sync now" });
    await syncButton.click();
    await expect(syncButton).toBeDisabled();
    await expect(syncButton).toHaveAttribute("aria-busy", "true");
    await page.getByRole("button", { name: "Actions" }).click();
    await expect(page.getByRole("menuitem", { name: /^Publish now/ })).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Tasks" })).toBeVisible();
    await page.getByRole("button", { name: "Tasks" }).click();
    const taskItem = page.getByText(`Sync repository "${REPO_NAME}"`);
    await expect(taskItem).toBeVisible();
    // The real fixtures.pulpproject.org sync of ~35 small packages.
    await expect(page.getByText("completed").first()).toBeVisible({ timeout: 60_000 });
    await page.getByRole("button", { name: "Close" }).click(); // close the drawer

    // --- Packages tab shows the synced content ----------------------------
    await page.getByRole("tab", { name: "Packages" }).click();
    // The fixture repo has two "walrus" packages at different versions.
    await expect(page.getByText("walrus").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /of 35/ })).toBeVisible();

    // --- Versions tab shows the new version --------------------------------
    await page.getByRole("tab", { name: "Versions" }).click();
    const versionsPanel = page.getByRole("tabpanel");
    await expect(versionsPanel.getByText(/Version 1/)).toBeVisible();
    await expect(versionsPanel.getByText("Current")).toBeVisible();
    await expect(versionsPanel.getByText("35 packages")).toBeVisible();

    // --- Upload an additional package directly ----------------------------
    await page.getByRole("tab", { name: "Packages" }).click();
    await page.getByRole("button", { name: "Upload package" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.locator('input[type="file"]').setInputFiles(FIXTURE_RPM_PATH);
    const uploadButton = dialog.getByRole("button", { name: "Upload" });
    await expect(uploadButton).toBeEnabled();
    await uploadButton.click();
    await expect(dialog).not.toBeVisible();

    // The upload registers a "modify" task (VERIFIED: two-step upload ->
    // modify flow) - wait for it to complete rather than asserting on
    // package count, since the fixture RPM is already synced (dedup by
    // content, not a net-new package).
    await page.getByRole("button", { name: "Tasks" }).click();
    await expect(
      page.getByText(`Add "walrus-5.21-1.noarch.rpm" to "${REPO_NAME}"`),
    ).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();

    // --- Create a distribution for the repository, from its own Distributions
    // tab (distributions are managed per-repository, not from a separate
    // global page - there's no repository picker to fill in). --------------
    await page.getByRole("tab", { name: "Distributions" }).click();
    await page.getByRole("button", { name: "Create distribution" }).first().click();
    await expect(
      page.getByRole("dialog").getByLabel("Base path", { exact: false }),
    ).toHaveCount(0);
    await page.getByRole("dialog").getByRole("button", { name: "Create" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();

    // Distribution create is asynchronous (VERIFIED: 202 + task, unlike
    // repositories/remotes) - it only appears once its task completes.
    const distRow = page
      .getByRole("row")
      .filter({ has: page.getByRole("gridcell", { name: REPO_NAME, exact: true }) });
    await expect(distRow).toBeVisible({ timeout: 15_000 });
    await expect(distRow).toContainText(`/pulp/content/${DIST_BASE_PATH}/`);

    // Create a second URL pinned to version 1. Unlike the default distribution
    // above, this publishes that immutable RepositoryVersion and stores the
    // resulting publication on the distribution.
    await page.getByRole("button", { name: "Create distribution" }).first().click();
    const pinnedDialog = page.getByRole("dialog");
    await pinnedDialog.getByLabel("Pin a repository version").click();
    const versionOneHref = await pinnedDialog
      .getByLabel("Repository version", { exact: true })
      .locator("option")
      .filter({ hasText: "Version 1" })
      .getAttribute("value");
    expect(versionOneHref).not.toBeNull();
    await pinnedDialog
      .getByLabel("Repository version", { exact: true })
      .selectOption(versionOneHref as string);
    await expect(pinnedDialog.getByLabel("Base path", { exact: false })).toHaveCount(0);
    await pinnedDialog.getByRole("button", { name: "Create" }).click();
    await expect(pinnedDialog).not.toBeVisible({ timeout: 30_000 });

    const pinnedDistRow = page.getByRole("row", {
      name: new RegExp(PINNED_DIST_NAME),
    });
    await expect(pinnedDistRow).toBeVisible({ timeout: 15_000 });
    const pinnedDistributionResponse = await page.request.get(
      `/pulp/api/v3/distributions/rpm/rpm/?name=${encodeURIComponent(PINNED_DIST_NAME)}`,
    );
    expect(pinnedDistributionResponse.ok()).toBeTruthy();
    const pinnedDistributionPage = (await pinnedDistributionResponse.json()) as {
      results: { repository: string | null; publication: string | null }[];
    };
    expect(pinnedDistributionPage.results[0]?.repository).toBeNull();
    expect(pinnedDistributionPage.results[0]?.publication).toContain(
      "/publications/rpm/rpm/",
    );

    // --- Clean up: distribution, repository, remote -------------------------
    await pinnedDistRow.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(pinnedDistRow).not.toBeVisible({ timeout: 10_000 });

    await distRow.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(distRow).not.toBeVisible({ timeout: 10_000 });

    await page.goto("/rpm/repositories");
    await page
      .getByRole("row", { name: new RegExp(REPO_NAME) })
      .getByRole("button", { name: `Actions for ${REPO_NAME}` })
      .click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(page.getByRole("row", { name: new RegExp(REPO_NAME) })).not.toBeVisible({
      timeout: 10_000,
    });

    await page.goto("/rpm/remotes");
    await page
      .getByRole("row", { name: new RegExp(REMOTE_NAME) })
      .getByRole("button", { name: "Delete" })
      .click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(
      page.getByRole("row", { name: new RegExp(REMOTE_NAME) }),
    ).not.toBeVisible({ timeout: 10_000 });
  });
});

test("RPM ULN remotes can be edited without re-entering saved credentials", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.goto("/rpm/remotes");
  await page.getByRole("button", { name: "ULN" }).click();
  await page.getByRole("button", { name: "Create ULN remote" }).first().click();
  const createDialog = page.getByRole("dialog");
  await createDialog.locator("#uln-remote-name").fill(ULN_REMOTE_NAME);
  await createDialog.locator("#uln-remote-url").fill("uln://e2e_initial_channel");
  await expect(createDialog.locator("#uln-remote-server-base-url")).toHaveValue(
    "https://linux-update.oracle.com/",
  );
  await createDialog.locator("#uln-remote-username").fill("e2e-user");
  await createDialog.locator("#uln-remote-password").fill("e2e-password");
  await createDialog.getByRole("button", { name: "Create" }).click();
  await expect(createDialog).not.toBeVisible();

  const row = page.getByRole("row", { name: new RegExp(ULN_REMOTE_NAME) });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Edit" }).click();

  const editDialog = page.getByRole("dialog");
  await expect(editDialog.getByText(/Currently set - leave blank/i)).toHaveCount(2);
  await page.setViewportSize({ width: 768, height: 800 });
  await expect(editDialog.getByRole("button", { name: "Save" })).toBeVisible();
  await editDialog.locator("#uln-remote-edit-url").fill("uln://e2e_updated_channel");
  await editDialog.getByRole("button", { name: "Save" }).click();
  await expect(editDialog).not.toBeVisible();
  await expect(row).toContainText("uln://e2e_updated_channel", { timeout: 15_000 });

  await row.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(row).not.toBeVisible({ timeout: 15_000 });
  expect(consoleErrors).toEqual([]);
});

test("RPM packages page lists content across every repository", async ({ page }) => {
  await page.goto("/rpm/packages");
  await expect(page.getByRole("heading", { name: "RPM packages" })).toBeVisible();
  // Some other spec/run may have left content synced - just assert the page
  // loads real data (a table) or the genuine empty state, never a crash.
  // PatternFly's <Table> renders role="grid", not "table".
  await expect(
    page
      .getByRole("grid", { name: "RPM packages" })
      .or(page.getByText("No RPM packages yet")),
  ).toBeVisible();

  const searchInput = page.getByRole("textbox", {
    name: "Search packages by name",
  });
  if (await searchInput.isVisible()) {
    const missingPackage = `no-such-package-${Date.now()}`;
    await searchInput.fill(missingPackage);
    await page.getByRole("button", { name: "Search" }).click();

    await expect(page.getByText("No matching RPM packages")).toBeVisible();
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveValue(missingPackage);
  }
});
