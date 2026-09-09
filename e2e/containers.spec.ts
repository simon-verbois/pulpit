import { expect, test } from "@playwright/test";

// Unique per run so re-running this spec against a live, already-populated
// dev stack doesn't collide with objects a previous run left behind (same
// convention as e2e/rpm.spec.ts / e2e/ansible.spec.ts).
const RUN_ID = Date.now();
const REMOTE_NAME = `e2e-container-remote-${RUN_ID}`;
const REPO_NAME = `e2e-container-repo-${RUN_ID}`;
const DIST_NAME = `e2e-container-dist-${RUN_ID}`;
const DIST_BASE_PATH = `container/${DIST_NAME}`;

test.describe.configure({ mode: "serial" });

test.describe("Containers: remote -> repository -> sync -> tags/manifests -> distribution", () => {
  test("exercises the full container content lifecycle against the live Pulp instance", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    // --- Create a remote ---------------------------------------------------
    // ghcr.io/pulp/hello-world is a real, tiny (~1.84kB) fixture image
    // maintained by the pulp_container project itself for exactly this kind
    // of test - VERIFIED live: registry.hub.docker.com's anonymous rate
    // limit made this spec flaky against a "real-world" image (busybox) at
    // first, even filtered to one tag.
    await page.goto("/containers/remotes");
    await page.getByRole("button", { name: "Create remote" }).click();
    await page.locator("#remote-name").fill(REMOTE_NAME);
    await page.locator("#remote-url").fill("https://ghcr.io");
    await page.locator("#remote-upstream-name").fill("pulp/hello-world");
    await page.getByRole("dialog").getByRole("button", { name: "Create" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(page.getByText(REMOTE_NAME)).toBeVisible();

    // --- Create a repository pointed at that remote -------------------------
    await page.goto("/containers/repositories");
    await page.getByRole("button", { name: "Create repository" }).click();
    await page.locator("#repository-name").fill(REPO_NAME);
    await page.locator("#repository-remote").selectOption({ label: REMOTE_NAME });
    await page.getByRole("dialog").getByRole("button", { name: "Create" }).click();

    await expect(page).toHaveURL(new RegExp(`/containers/repositories/${REPO_NAME}$`));
    await expect(page.getByRole("heading", { name: REPO_NAME })).toBeVisible();

    // --- Sync from the real registry -----------------------------------------
    await page.getByRole("button", { name: "Sync now" }).click();
    await page.getByRole("button", { name: "Tasks" }).click();
    await expect(page.getByText(`Sync repository "${REPO_NAME}"`)).toBeVisible();
    await expect(page.getByText("completed").first()).toBeVisible({ timeout: 60_000 });
    await page.getByRole("button", { name: "Close" }).click();
    await page.reload();

    // --- Versions tab shows real synced content -----------------------------
    await page.getByRole("tab", { name: "Versions" }).click();
    await expect(page.getByText(/tags, \d+ manifests/)).toBeVisible();

    // --- Tags tab shows the real synced tag ----------------------------------
    await page.getByRole("tab", { name: "Tags" }).click();
    await expect(page.getByRole("gridcell", { name: "latest" })).toBeVisible({
      timeout: 10_000,
    });

    // --- Manifests tab shows real manifest metadata --------------------------
    await page.getByRole("tab", { name: "Manifests" }).click();
    await expect(page.getByRole("gridcell", { name: "amd64" }).first()).toBeVisible({
      timeout: 10_000,
    });

    // --- Create a distribution and check its pull command --------------------
    await page.getByRole("tab", { name: "Distributions" }).click();
    await page.getByRole("button", { name: "Create distribution" }).first().click();
    await page
      .getByRole("dialog")
      .getByLabel("Base path", { exact: false })
      .fill(DIST_NAME);
    await page.getByRole("dialog").getByRole("button", { name: "Create" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();

    const distRow = page.getByRole("row", { name: new RegExp(DIST_NAME) });
    await expect(distRow).toBeVisible({ timeout: 15_000 });
    await expect(distRow).toContainText(new RegExp(`podman pull .*${DIST_BASE_PATH}`));

    // --- Global Tags page lists tags across every repository ----------------
    await page.goto("/containers/tags");
    await expect(page.getByRole("gridcell", { name: "latest" }).first()).toBeVisible({
      timeout: 10_000,
    });

    // --- Clean up: distribution (which also deletes the repository), remote -
    // VERIFIED live: deleting a container distribution cascades to delete
    // the repository it points at too (unlike RPM/Ansible, where deleting a
    // distribution never touches the repository) - Pulpit's own confirm
    // dialog warns about this (see RepositoryDistributionsTab.tsx), and
    // there's no separate repository-delete step needed here.
    await page.goto(`/containers/repositories/${REPO_NAME}`);
    await page.getByRole("tab", { name: "Distributions" }).click();
    await page
      .getByRole("row", { name: new RegExp(DIST_NAME) })
      .getByRole("button", { name: "Delete" })
      .click();
    const deleteDistDialog = page.getByRole("dialog");
    await expect(deleteDistDialog.getByText(/also deletes/i)).toBeVisible();
    await deleteDistDialog.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();

    await page.goto("/containers/repositories");
    await expect(page.getByRole("row", { name: new RegExp(REPO_NAME) })).not.toBeVisible({
      timeout: 10_000,
    });

    await page.goto("/containers/remotes");
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
