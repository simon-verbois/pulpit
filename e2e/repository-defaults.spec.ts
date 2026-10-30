import { expect, test } from "@playwright/test";
import { nativeFixtures } from "./nativeFixtures";

for (const [route, kind] of [
  ["rpm", "rpm/rpm"],
  ["files", "file/file"],
  ["deb", "deb/apt"],
  ["python", "python/python"],
]) {
  for (const autopublish of [true, false]) {
    test(`${route}: autopublish defaults on and can be ${autopublish ? "kept" : "disabled"}`, async ({
      page,
    }) => {
      const api = await nativeFixtures(page);
      const name = `e2e-gui-autopublish-${route}-${autopublish}-${Date.now()}`;
      const base = `/pulp/api/v3/repositories/${kind}/`;
      try {
        await page.goto(`/${route}/repositories`);
        await page
          .getByRole("button", { name: "Create repository", exact: true })
          .first()
          .click();
        const dialog = page.getByRole("dialog");
        const checkbox = dialog.getByLabel(
          "Automatically publish after each sync or content change",
        );
        await expect(checkbox).toBeChecked();
        if (!autopublish) await checkbox.uncheck();
        await dialog.locator("#repository-name").fill(name);
        const creating = page.waitForResponse(
          (response) =>
            new URL(response.url()).pathname === base &&
            response.request().method() === "POST",
        );
        await dialog.getByRole("button", { name: "Create", exact: true }).click();
        const response = await creating;
        expect(response.status()).toBe(201);
        const repository = await response.json();
        api.remember(repository.pulp_href);
        expect(response.request().postDataJSON().autopublish).toBe(autopublish);
        expect(repository.autopublish).toBe(autopublish);
        await expect(dialog).not.toBeVisible();
      } finally {
        await api.cleanup();
      }
    });
  }
}

test("repository action icons align with Sync text at desktop and mobile widths", async ({
  page,
}) => {
  const api = await nativeFixtures(page);
  const name = `e2e-gui-alignment-${Date.now()}`;
  try {
    await api.create("/pulp/api/v3/repositories/rpm/rpm/", { name });
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/rpm/repositories");
      const search = page.getByPlaceholder("Search by name…");
      await search.fill(name);
      await search.press("Enter");
      const row = page
        .getByRole("row")
        .filter({ has: page.getByRole("link", { name, exact: true }) });
      const sync = row.getByRole("button", { name: "Sync", exact: true });
      const menu = row.getByRole("button", { name: `Actions for ${name}`, exact: true });
      await expect(menu).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const text = await sync.locator(".pf-v6-c-button__text").boundingBox();
      const icon = await menu.locator("svg").boundingBox();
      expect(
        Math.abs(text!.y + text!.height / 2 - icon!.y - icon!.height / 2),
      ).toBeLessThan(1);
      await row.screenshot({ path: test.info().outputPath(`actions-${width}.png`) });
      await menu.click();
      await expect(
        page.getByRole("menuitem", { name: "Edit", exact: true }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
    }
  } finally {
    await api.cleanup();
  }
});
