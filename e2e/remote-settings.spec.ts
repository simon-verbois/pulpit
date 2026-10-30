import { expect, test } from "@playwright/test";
import { nativeFixtures } from "./nativeFixtures";

const remotes = [
  ["rpm", "rpm/rpm", ""],
  ["rpm", "rpm/uln", "ULN"],
  ["files", "file/file", ""],
  ["files", "file/git", "Git"],
  ["ansible", "ansible/collection", ""],
  ["ansible", "ansible/git", "Git"],
  ["ansible", "ansible/role", "Role"],
  ["containers", "container/container", ""],
  ["deb", "deb/apt", ""],
  ["python", "python/python", ""],
  ["gems", "gem/gem", ""],
  ["maven", "maven/maven", ""],
  ["npm", "npm/npm", ""],
  ["hugging-face", "hugging_face/hugging-face", ""],
];

for (const [route, kind, flavor] of remotes) {
  test(`${kind}: create and edit a saved remote TLS exception`, async ({ page }) => {
    test.setTimeout(90000);
    const api = await nativeFixtures(page);
    const name = `e2e-gui-tls-${kind.replaceAll("/", "-")}-${Date.now()}`;
    const base = `/pulp/api/v3/remotes/${kind}/`;
    try {
      await page.goto(`/${route}/remotes`);
      if (flavor) await page.getByRole("button", { name: flavor, exact: true }).click();
      await page
        .getByRole("button", { name: /^Create .*remote$/i })
        .first()
        .click();
      let dialog = page.getByRole("dialog");
      await dialog
        .locator(
          "#remote-name, #uln-remote-name, #git-remote-name, #collection-remote-name, #role-remote-name",
        )
        .fill(name);
      if (kind === "rpm/uln") {
        await dialog.getByLabel(/^Channel URL/).fill("uln://fixture-channel");
        await dialog.getByLabel(/^ULN username/).fill("fixture-user");
        await dialog.getByLabel(/^ULN password/).fill("fixture-password");
      } else {
        await dialog
          .locator(
            "#remote-url, #git-remote-url, #collection-remote-url, #role-remote-url",
          )
          .fill(
            route === "containers"
              ? "https://example.invalid"
              : "https://example.invalid/source/",
          );
        if (route === "containers")
          await dialog.getByLabel(/^Upstream image name/).fill("library/fixture");
        if (route === "deb") await dialog.getByLabel(/^Distributions/).fill("bookworm");
        await dialog
          .getByRole("button", { name: "Advanced connection settings", exact: true })
          .click();
      }
      const checkbox = dialog.getByLabel("Ignore SSL certificate errors", {
        exact: true,
      });
      await expect(checkbox).not.toBeChecked();
      await checkbox.check();
      const creating = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === base &&
          response.request().method() === "POST",
      );
      await dialog.getByRole("button", { name: "Create", exact: true }).click();
      const created = await creating;
      expect(created.status()).toBe(201);
      const remote = await created.json();
      api.remember(remote.pulp_href);
      expect(remote.tls_validation).toBe(false);
      await expect(dialog).not.toBeVisible();
      const search = page.getByPlaceholder("Search by name…");
      await search.fill(name);
      await search.press("Enter");
      const row = page.getByRole("row").filter({ hasText: name });
      await row.getByRole("button", { name: "Edit", exact: true }).click();
      dialog = page.getByRole("dialog");
      if (kind !== "rpm/uln")
        await dialog
          .getByRole("button", { name: "Advanced connection settings", exact: true })
          .click();
      await expect(
        dialog.getByLabel("Ignore SSL certificate errors", { exact: true }),
      ).toBeChecked();
      if (kind === "rpm/rpm" || kind === "rpm/uln") {
        await page.setViewportSize({ width: 390, height: 844 });
        expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
          true,
        );
      }
      await dialog.getByLabel("Ignore SSL certificate errors", { exact: true }).uncheck();
      const saving = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === remote.pulp_href &&
          response.request().method() === "PATCH",
      );
      await dialog.getByRole("button", { name: "Save", exact: true }).click();
      const saved = await saving;
      expect(saved.status()).toBe(202);
      const body = saved.request().postDataJSON();
      expect(body.tls_validation).toBe(true);
      expect(body).not.toHaveProperty("password");
      await api.wait((await saved.json()).task);
      expect(
        (await (await page.request.get(remote.pulp_href)).json()).tls_validation,
      ).toBe(true);
      await expect(dialog).not.toBeVisible();
    } finally {
      await api.cleanup();
    }
  });
}
