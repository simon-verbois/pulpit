import { expect, test } from "@playwright/test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Real fixture tarballs, checked into the repo - a real collection built
// with `ansible-galaxy collection build` (including a meta/runtime.yml with
// `requires_ansible`, which Pulp rejects tarballs for lacking - VERIFIED
// live, see docs/PULP_API.md) and a minimal real role tarball.
const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_COLLECTION_PATH = join(
  __dirname,
  "fixtures",
  "pulpit_test-demo-1.0.0.tar.gz",
);
const FIXTURE_ROLE_PATH = join(__dirname, "fixtures", "testrole.tar.gz");

// Unique per run so re-running this spec against a live, already-populated
// dev stack doesn't collide with objects a previous run left behind.
const RUN_ID = Date.now();
const REMOTE_NAME = `e2e-ansible-remote-${RUN_ID}`;
const REPO_NAME = `e2e-ansible-repo-${RUN_ID}`;
const DIST_NAME = `e2e-ansible-dist-${RUN_ID}`;
// Role content is permanent (no delete step below, and re-uploading the same
// namespace/name/version is a real, rejected duplicate - not just a leftover
// artifact) - unique per run like everything else here.
const ROLE_NAMESPACE = `pulpit_e2e_${RUN_ID}`;
const ROLE_NAME = "testrole";

test.describe.configure({ mode: "serial" });

test.describe("Ansible: remote -> repository -> upload -> distribution -> namespace -> search", () => {
  test("exercises the full Ansible content lifecycle against the live Pulp instance", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    // --- Create a Collection remote ---------------------------------------
    await page.goto("/ansible/remotes");
    await page.getByRole("button", { name: "Create Collection remote" }).first().click();
    await page.locator("#collection-remote-name").fill(REMOTE_NAME);
    await page.locator("#collection-remote-url").fill("https://galaxy.ansible.com/api/");
    await page.getByRole("dialog").getByRole("button", { name: "Create" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(page.getByText(REMOTE_NAME)).toBeVisible();

    // --- Create a repository pointed at that remote -----------------------
    await page.goto("/ansible/repositories");
    await page.getByRole("button", { name: "Create repository" }).first().click();
    await page.locator("#repository-name").fill(REPO_NAME);
    await page
      .locator("#repository-remote")
      .selectOption({ label: `${REMOTE_NAME} (Collection)` });
    await page.getByRole("dialog").getByRole("button", { name: "Create" }).click();

    await expect(page).toHaveURL(new RegExp(`/ansible/repositories/${REPO_NAME}$`));
    await expect(page.getByRole("heading", { name: REPO_NAME })).toBeVisible();

    // --- Upload a real collection directly ---------------------------------
    await page.getByRole("tab", { name: "Collections" }).click();
    await page.getByRole("button", { name: "Upload collection" }).click();
    const collectionDialog = page.getByRole("dialog");
    await collectionDialog
      .locator('input[type="file"]')
      .setInputFiles(FIXTURE_COLLECTION_PATH);
    await collectionDialog.getByRole("button", { name: "Upload" }).click();
    await expect(collectionDialog).not.toBeVisible();

    // Collection upload is asynchronous (VERIFIED live: 202 + task, unlike
    // RPM package upload) - wait for the task, then the row to appear.
    await page.getByRole("button", { name: "Tasks" }).click();
    await expect(
      page.getByText(`Upload "pulpit_test-demo-1.0.0.tar.gz" to "${REPO_NAME}"`),
    ).toBeVisible();
    await expect(page.getByText("completed").first()).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Close" }).click();
    await expect(page.getByRole("gridcell", { name: "pulpit_test" })).toBeVisible({
      timeout: 10_000,
    });

    // --- Mark content, then check the Overview tab reflects it (these
    // adapters were built but left unwired until a later audit caught the
    // dead code - see docs/ROADMAP.md) --------------------------------------
    await page.getByRole("tab", { name: "Overview" }).click();
    await expect(page.getByText("None yet").first()).toBeVisible();
    await page.getByRole("button", { name: "Mark content…", exact: true }).click();
    const markDialog = page.getByRole("dialog");
    await markDialog.getByLabel("Value", { exact: false }).fill(`e2e-verified-${RUN_ID}`);
    await markDialog.getByRole("button", { name: "Mark" }).click();
    await expect(markDialog).not.toBeVisible();

    // Marking is asynchronous (202 + task) - wait for it to actually
    // complete server-side before reloading, otherwise the mark record
    // doesn't exist yet.
    await page.getByRole("button", { name: "Tasks" }).click();
    await expect(page.getByText(`Mark content "e2e-verified-${RUN_ID}"`)).toBeVisible();
    await expect(page.getByText("completed").first()).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Close" }).click();

    await page.reload();
    await page.getByRole("tab", { name: "Overview" }).click();
    await expect(page.getByText(`e2e-verified-${RUN_ID}`)).toBeVisible({
      timeout: 15_000,
    });

    // --- Deprecate the collection from the global Collections page ---------
    // Deprecation has no undo (VERIFIED live: no DELETE on this resource) and
    // is keyed on namespace+name, not a per-run-unique value like the mark
    // above - re-running this spec against the same persistent dev Pulp
    // instance re-deprecates an already-deprecated "pulpit_test.demo" and
    // fails the task with a duplicate-key error (VERIFIED live). Either way
    // the end state - a deprecation record exists - is already reached, so
    // this only asserts the visible outcome, not that *this* task succeeds.
    await page.goto("/ansible/collections");
    await page.getByRole("button", { name: "Deprecate collection…" }).click();
    const deprecateDialog = page.getByRole("dialog");
    await deprecateDialog.getByLabel("Namespace", { exact: false }).fill("pulpit_test");
    await deprecateDialog.getByLabel(/^Name\b/).fill("demo");
    await deprecateDialog
      .getByLabel("Repository", { exact: false })
      .selectOption({ label: REPO_NAME });
    await deprecateDialog.getByRole("button", { name: "Deprecate" }).click();
    await expect(deprecateDialog).not.toBeVisible();

    await page.reload();
    await expect(page.getByText("pulpit_test.demo")).toBeVisible({ timeout: 20_000 });

    await page.goto(`/ansible/repositories/${REPO_NAME}`);

    // --- Upload a role (VERIFIED live: real two-step artifact+content flow,
    // synchronous - see docs/PULP_API.md) -----------------------------------
    await page.getByRole("tab", { name: "Roles" }).click();
    await page.getByRole("button", { name: "Upload role" }).click();
    const roleDialog = page.getByRole("dialog");
    await roleDialog.locator("#role-namespace").fill(ROLE_NAMESPACE);
    await roleDialog.locator("#role-name").fill(ROLE_NAME);
    await roleDialog.locator("#role-version").fill("1.0.0");
    await roleDialog.locator('input[type="file"]').setInputFiles(FIXTURE_ROLE_PATH);
    await roleDialog.getByRole("button", { name: "Upload" }).click();
    await expect(roleDialog).not.toBeVisible();
    await expect(page.getByText(ROLE_NAMESPACE)).toBeVisible();

    // --- Versions tab shows both content types -----------------------------
    await page.getByRole("tab", { name: "Versions" }).click();
    await expect(page.getByText(/1 collections, 1 roles/)).toBeVisible();

    // --- Create a distribution and check its client config snippet --------
    await page.getByRole("tab", { name: "Distributions" }).click();
    await page.getByRole("button", { name: "Create distribution" }).first().click();
    await page.locator("#distribution-name").fill(DIST_NAME);
    await page.locator("#distribution-base-path").fill(DIST_NAME);
    await page.getByRole("dialog").getByRole("button", { name: "Create" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();

    const distRow = page.getByRole("row", { name: new RegExp(DIST_NAME) });
    await expect(distRow).toBeVisible({ timeout: 15_000 });
    // The client config snippet is a ClipboardCopy textbox - its content is
    // the input's value, not rendered text (getByText wouldn't find it).
    await expect(distRow.getByRole("textbox")).toHaveValue(
      new RegExp(`server_list = ${DIST_NAME}`),
    );

    // --- Namespace management is scoped to this (brand new, so empty) distribution
    await page.goto("/ansible/namespaces");
    await page
      .getByRole("combobox", { name: "Distribution" })
      .selectOption({ label: DIST_NAME });
    await expect(page.getByText("No namespaces yet")).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: "Create namespace" }).first().click();
    const createNsDialog = page.getByRole("dialog");
    await createNsDialog.locator("#namespace-name").fill(ROLE_NAMESPACE);
    await createNsDialog.locator("#namespace-company").fill("Pulpit");
    await createNsDialog.getByRole("button", { name: "Create" }).click();
    await expect(createNsDialog).not.toBeVisible();
    await expect(page.getByText(ROLE_NAMESPACE)).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: "Edit" }).first().click();
    await page.locator("#namespace-edit-company").fill("Pulpit E2E");
    await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(page.getByText("Pulpit E2E")).toBeVisible({ timeout: 10_000 });

    // --- Cross-repository search finds the uploaded collection -------------
    // VERIFIED live: the search index returns one row per collection version
    // *content unit*, not one per (repository, content unit) pair - the same
    // uploaded tarball already present in another repository from earlier
    // testing shows only that repository here, not every repository holding
    // it. So this only asserts the collection is findable at all, not which
    // repository the row names.
    await page.goto("/ansible/search");
    await page.getByPlaceholder("Search…").fill("demo");
    await page.getByPlaceholder("Search…").press("Enter");
    await expect(page.getByRole("gridcell", { name: "demo" }).first()).toBeVisible({
      timeout: 10_000,
    });

    // --- Clean up: distribution, repository, remote ------------------------
    await page.goto(`/ansible/repositories/${REPO_NAME}`);
    await page.getByRole("tab", { name: "Distributions" }).click();
    await page
      .getByRole("row", { name: new RegExp(DIST_NAME) })
      .getByRole("button", { name: "Delete" })
      .click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();

    await page.goto("/ansible/repositories");
    await page
      .getByRole("row", { name: new RegExp(REPO_NAME) })
      .getByRole("button", { name: "Delete" })
      .click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(page.getByRole("row", { name: new RegExp(REPO_NAME) })).not.toBeVisible({
      timeout: 10_000,
    });

    await page.goto("/ansible/remotes");
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

test("Ansible remotes page toggles between Collection/Git/Role without crashing", async ({
  page,
}) => {
  await page.goto("/ansible/remotes");
  await expect(page.getByRole("heading", { name: "Ansible remotes" })).toBeVisible();
  await page.getByRole("button", { name: "Git", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Create Git remote" }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Role", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Create Role remote" }).first(),
  ).toBeVisible();
});
