import { expect, test, type Locator, type Page } from "@playwright/test";

// Unique per run so re-running this spec against a live, already-populated
// dev stack doesn't collide with objects a previous run left behind (same
// convention as e2e/rpm.spec.ts / e2e/ansible.spec.ts / e2e/containers.spec.ts).
const RUN_ID = Date.now();
const USERNAME = `e2e-access-user-${RUN_ID}`;
const GROUPNAME = `e2e-access-group-${RUN_ID}`;
// Role names are Django permission-codename-like - underscores, not dashes.
const ROLENAME = `e2e_access_role_${RUN_ID}`;
const REPO_NAME = `e2e-access-repo-${RUN_ID}`;

test.describe.configure({ mode: "serial" });

// Real keystrokes and keyboard selection, not .fill()+click(): PatternFly's
// typeahead menu never leaves its initial aria-hidden state when the value is
// set programmatically, and its animated popper makes a mouse click on the
// option flaky right after it appears. Waiting for the option before pressing
// Enter avoids racing the users/groups list that's still loading.
async function selectTypeaheadOption(page: Page, input: Locator, value: string) {
  await input.pressSequentially(value);
  await expect(page.getByRole("option", { name: value, exact: true })).toBeVisible();
  await input.press("ArrowDown");
  await input.press("Enter");
}

test.describe("Access: users -> roles -> groups -> object-level permissions", () => {
  test("exercises the full RBAC lifecycle against the live Pulp instance", async ({
    page,
  }) => {
    test.setTimeout(60_000);

    // --- Create a user (synchronous, VERIFIED live: 201, no task) ----------
    await page.goto("/admin?tab=access&subtab=users");
    await page.getByRole("button", { name: "Create user" }).click();
    await page.locator("#user-username").fill(USERNAME);
    await page.locator("#user-password").fill("TestPass123!");
    await page.getByRole("dialog").getByRole("button", { name: "Create" }).click();
    await expect(page).toHaveURL(new RegExp(`/access/users/${USERNAME}$`));
    await expect(page.getByRole("heading", { name: USERNAME })).toBeVisible();

    // --- Edit it, synchronously (no task) -----------------------------------
    await page.getByRole("button", { name: "Edit" }).click();
    await page.locator("#user-edit-first-name").fill("E2E");
    await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(page.getByText("E2E", { exact: true })).toBeVisible();

    // --- Create a custom role with one permission ---------------------------
    await page.goto("/admin?tab=access&subtab=roles");
    await page.getByRole("button", { name: "Create role" }).click();
    const createRoleDialog = page.getByRole("dialog");
    await createRoleDialog.locator("#role-name").fill(ROLENAME);
    await createRoleDialog
      .getByPlaceholder("Filter permissions…")
      .fill("rpm.view_rpmrepository");
    await createRoleDialog.getByLabel("rpm.view_rpmrepository").check();
    await createRoleDialog.getByRole("button", { name: "Create" }).click();
    await expect(createRoleDialog).not.toBeVisible();
    // All is the default filter - the new role should already be visible.
    await expect(page.getByText(ROLENAME)).toBeVisible();

    // --- Assign that role to the user, globally -----------------------------
    await page.goto(`/access/users/${USERNAME}`);
    await page.getByRole("tab", { name: "Roles" }).click();
    await expect(page.getByText("No roles assigned yet")).toBeVisible();
    await page.getByRole("button", { name: "Assign role…" }).first().click();
    const assignDialog = page.getByRole("dialog");
    await selectTypeaheadOption(
      page,
      assignDialog.locator("#assign-role-select"),
      ROLENAME,
    );
    await assignDialog.getByRole("button", { name: "Assign" }).click();
    await expect(assignDialog).not.toBeVisible();
    await expect(page.getByText(ROLENAME)).toBeVisible();
    await expect(page.getByText("Global")).toBeVisible();

    // --- Create a group, add the user as a member ---------------------------
    await page.goto("/admin?tab=access&subtab=groups");
    await page.getByRole("button", { name: "Create group" }).click();
    await page.locator("#group-name").fill(GROUPNAME);
    await page.getByRole("dialog").getByRole("button", { name: "Create" }).click();
    await expect(page).toHaveURL(new RegExp(`/access/groups/${GROUPNAME}$`));

    await page.getByRole("button", { name: "Add member…" }).first().click();
    const addMemberDialog = page.getByRole("dialog");
    await selectTypeaheadOption(
      page,
      addMemberDialog.locator("#add-member-users"),
      USERNAME,
    );
    await addMemberDialog.getByRole("button", { name: "Add" }).click();
    await expect(addMemberDialog).not.toBeVisible();
    await expect(page.getByText(USERNAME)).toBeVisible();

    // Remove the member again - back to empty.
    await page.getByRole("button", { name: "Remove" }).click();
    await expect(page.getByText("No members yet")).toBeVisible();

    // --- Object-level access: grant a role scoped to one RPM repository -----
    await page.goto("/rpm/repositories");
    await page.getByRole("button", { name: "Create repository" }).click();
    await page.locator("#repository-name").fill(REPO_NAME);
    await page.getByRole("dialog").getByRole("button", { name: "Create" }).click();
    await expect(page).toHaveURL(new RegExp(`/rpm/repositories/${REPO_NAME}$`));

    await page.getByRole("tab", { name: "Access" }).click();
    // Pulp auto-grants the creator (admin) an owner role - the tab should
    // already show that row, not the empty state.
    await expect(page.getByText("rpm.rpmrepository_owner")).toBeVisible();

    await page.getByRole("button", { name: "Grant access…" }).first().click();
    const grantDialog = page.getByRole("dialog");
    await selectTypeaheadOption(
      page,
      grantDialog.locator("#grant-access-role"),
      "rpm.rpmrepository_viewer",
    );
    await selectTypeaheadOption(
      page,
      grantDialog.locator("#grant-access-users"),
      USERNAME,
    );
    await selectTypeaheadOption(
      page,
      grantDialog.locator("#grant-access-groups"),
      GROUPNAME,
    );
    await grantDialog.getByRole("button", { name: "Grant" }).click();
    await expect(grantDialog).not.toBeVisible();

    const accessRow = page.getByRole("row", { name: new RegExp(USERNAME) });
    await expect(accessRow).toBeVisible();
    await expect(accessRow.getByText("rpm.rpmrepository_viewer")).toBeVisible();
    const groupAccessRow = page.getByRole("row", { name: new RegExp(GROUPNAME) });
    await expect(groupAccessRow).toBeVisible();
    await expect(groupAccessRow.getByText("rpm.rpmrepository_viewer")).toBeVisible();

    // Remove just this one - the auto-granted owner row for admin survives.
    await accessRow.getByRole("button", { name: "Remove" }).click();
    await expect(accessRow).not.toBeVisible();
    await groupAccessRow.getByRole("button", { name: "Remove" }).click();
    await expect(groupAccessRow).not.toBeVisible();
    await expect(page.getByText("rpm.rpmrepository_owner")).toBeVisible();

    // --- Clean up: repository, group, role, user ----------------------------
    await page.goto("/rpm/repositories");
    await page
      .getByRole("row", { name: new RegExp(REPO_NAME) })
      .getByRole("button", { name: "Delete" })
      .click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();

    await page.goto("/admin?tab=access&subtab=groups");
    await page
      .getByRole("row", { name: new RegExp(GROUPNAME) })
      .getByRole("button", { name: "Delete" })
      .click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();

    await page.goto("/admin?tab=access&subtab=roles");
    await page
      .getByRole("row", { name: new RegExp(ROLENAME) })
      .getByRole("button", { name: "Delete" })
      .click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();

    await page.goto("/admin?tab=access&subtab=users");
    await page
      .getByRole("row", { name: new RegExp(USERNAME) })
      .getByRole("button", { name: "Delete" })
      .click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(page.getByRole("row", { name: new RegExp(USERNAME) })).not.toBeVisible();
  });
});
