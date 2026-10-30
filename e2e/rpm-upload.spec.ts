import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { nativeFixtures } from "./nativeFixtures";

const rpm = readFileSync(new URL("./fixtures/walrus-5.21-1.noarch.rpm", import.meta.url));
const uploadPath = "/pulp/api/v3/content/rpm/packages/upload/";

for (const partialFailure of [false, true]) {
  test(`RPM multiple upload ${partialFailure ? "retries only rejected files on a narrow screen" : "submits a batch in one native repository task"}`, async ({
    page,
  }) => {
    test.setTimeout(90000);
    const fixture = await nativeFixtures(page);
    const name = `e2e-gui-rpm-upload-${partialFailure}-${Date.now()}`;
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    try {
      const repository = await fixture.create("/pulp/api/v3/repositories/rpm/rpm/", {
        name,
      });
      if (partialFailure) await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`/rpm/repositories/${name}`);
      await page.getByRole("tab", { name: "Packages", exact: true }).click();
      await page.getByRole("button", { name: "Upload package", exact: true }).click();
      const dialog = page.getByRole("dialog");
      let uploads = 0;
      let modifies = 0;
      await page.route(`**${uploadPath}`, async (route) => {
        uploads++;
        if (partialFailure && uploads === 2) {
          await route.fulfill({
            status: 503,
            json: { detail: "Temporary fixture rejection" },
          });
        } else await route.continue();
      });
      page.on("request", (request) => {
        if (
          request.url().endsWith(`${repository.pulp_href}modify/`) &&
          request.method() === "POST"
        ) {
          modifies++;
          // Two names for identical bytes also exercise native content deduplication.
          expect(request.postDataJSON().add_content_units).toHaveLength(1);
        }
      });
      await dialog.locator('input[type="file"]').setInputFiles([
        { name: "first.rpm", mimeType: "application/x-rpm", buffer: rpm },
        { name: "second.rpm", mimeType: "application/x-rpm", buffer: rpm },
      ]);
      await expect(dialog.getByText("first.rpm", { exact: true })).toBeVisible();
      await expect(dialog.getByText("second.rpm", { exact: true })).toBeVisible();
      const submitted = page.waitForResponse(
        (response) =>
          response.url().endsWith(`${repository.pulp_href}modify/`) &&
          response.request().method() === "POST",
      );
      await dialog.getByRole("button", { name: "Upload", exact: true }).click();
      const firstTask = (await (await submitted).json()).task;
      await fixture.wait(firstTask);
      if (partialFailure) {
        await expect(
          dialog.getByText("Submitted — follow signing and repository updates in Tasks"),
        ).toBeVisible();
        await expect(dialog.getByText("Pulp is currently unavailable.")).toBeVisible();
        expect(uploads).toBe(2);
        const retried = page.waitForResponse(
          (response) =>
            response.url().endsWith(`${repository.pulp_href}modify/`) &&
            response.request().method() === "POST",
        );
        await dialog.getByRole("button", { name: "Retry failed files" }).click();
        await fixture.wait((await (await retried).json()).task);
      }
      await expect(dialog).not.toBeVisible();
      expect(uploads).toBe(partialFailure ? 3 : 2);
      expect(modifies).toBe(partialFailure ? 2 : 1);
      await expect(
        page.getByRole("gridcell", { name: /^(Name )?walrus$/ }),
      ).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(overflow).toBe(false);
      expect(errors).toEqual([]);
    } finally {
      await fixture.cleanup();
    }
  });
}
