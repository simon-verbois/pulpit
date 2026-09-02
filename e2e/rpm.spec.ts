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
const DIST_NAME = `e2e-dist-${RUN_ID}`;

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
    await page.getByRole("dialog").getByRole("button", { name: "Create" }).click();

    // Synchronous create (VERIFIED: 201, no task) navigates straight to the
    // new repository's detail page.
    await expect(page).toHaveURL(new RegExp(`/rpm/repositories/${REPO_NAME}$`));
    await expect(page.getByRole("heading", { name: REPO_NAME })).toBeVisible();

    // --- Sync it and wait for the tracked task to complete ----------------
    await page.getByRole("button", { name: "Sync now" }).click();
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
    await expect(page.getByText(/Version 1/)).toBeVisible();
    await expect(page.getByText("Current")).toBeVisible();
    await expect(page.getByText("35 packages")).toBeVisible();

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
    await page.locator("#distribution-name").fill(DIST_NAME);
    await page.locator("#distribution-base-path").fill(DIST_NAME);
    await page.getByRole("dialog").getByRole("button", { name: "Create" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();

    // Distribution create is asynchronous (VERIFIED: 202 + task, unlike
    // repositories/remotes) - it only appears once its task completes.
    const distRow = page.getByRole("row", { name: new RegExp(DIST_NAME) });
    await expect(distRow).toBeVisible({ timeout: 15_000 });
    const distributionUrl = await distRow.getByRole("textbox").inputValue();
    expect(distributionUrl).toMatch(new RegExp(`/pulp/content/${DIST_NAME}/$`));

    // --- Clean up: distribution, repository, remote -------------------------
    await distRow.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(page.getByRole("row", { name: new RegExp(DIST_NAME) })).not.toBeVisible({
      timeout: 10_000,
    });

    await page.goto("/rpm/repositories");
    await page
      .getByRole("row", { name: new RegExp(REPO_NAME) })
      .getByRole("button", { name: "Delete" })
      .click();
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
});
