import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const dialogName = "What's new in PulpIT";

test("bundled release history opens inside the app and works without external requests", async ({
  page,
  baseURL,
}) => {
  const appOrigin = new URL(baseURL!).origin;
  const external: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).origin !== appOrigin) {
      external.push(request.url());
    }
  });
  await page.goto("/");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const footer = page.locator(".pulpit-footer");
  await expect(footer.getByText(/MIT License/)).toBeVisible();
  await expect(footer.getByRole("link")).toHaveCount(0);
  await footer.getByRole("button", { name: "Changelog" }).click();
  const dialog = page.getByRole("dialog", { name: dialogName });
  await expect(dialog).toBeVisible();
  const version = dialog.getByLabel("Version");
  const current = await version.inputValue();
  await version.selectOption("2026.44.4");
  await expect(
    dialog.getByText(/Configure automatic task-history retention/),
  ).toBeVisible();
  await version.selectOption("2026.43.2");
  await expect(dialog.getByText(/The web UI loads each page on demand/)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(footer.getByRole("button", { name: "Changelog" })).toBeFocused();
  await footer.getByRole("button", { name: "Changelog" }).click();
  await expect(version).toHaveValue(current);
  expect(external).toEqual([]);
});

test("new releases open once after login and dismissal survives reloads", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("release-announcement-test")) {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith("pulpit:last-seen-release:")) {
          localStorage.setItem(key, "2026.1.1");
        }
      }
      for (const cookie of document.cookie.split(";")) {
        const name = cookie.split("=")[0].trim();
        if (name.startsWith("pulpit_release_seen_")) {
          document.cookie = `${name}=2026.1.1; Path=/; SameSite=Lax`;
        }
      }
      sessionStorage.setItem("release-announcement-test", "started");
    }
  });
  await page.goto("/");
  const dialog = page.getByRole("dialog", { name: dialogName });
  await expect(dialog).toBeVisible();
  const current = await dialog.getByLabel("Version").inputValue();
  await dialog.getByLabel("Version").selectOption("2026.43.2");
  await dialog.getByRole("button", { name: "Close", exact: true }).last().click();
  await expect(dialog).toBeHidden();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Overview", level: 1 })).toBeVisible();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: "Changelog" }).click();
  await expect(dialog.getByLabel("Version")).toHaveValue(current);
});

test("release popup is accessible in both themes and fits a narrow screen", async ({
  page,
}) => {
  await page.goto("/");
  for (const theme of ["light", "dark"]) {
    if (theme === "dark") {
      await page.getByRole("button", { name: "Switch to dark theme" }).click();
    }
    await page.getByRole("button", { name: "Changelog" }).click();
    const dialog = page.getByRole("dialog", { name: dialogName });
    await expect(dialog).toBeVisible();
    // Theme and dialog transitions can briefly interpolate link colors.
    // Measure the settled UI, including the footer behind the modal.
    await page.evaluate(async () => {
      await Promise.all(
        document
          .getAnimations()
          .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
          .map((animation) => animation.finished.catch(() => undefined)),
      );
    });
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
    await dialog.getByRole("button", { name: "Close", exact: true }).last().click();
    await expect(dialog).toBeHidden();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Changelog" }).click();
  const dialog = page.getByRole("dialog", { name: dialogName });
  await dialog.getByLabel("Version").selectOption("2026.41.2");
  await expect(
    dialog.getByRole("button", { name: "Close", exact: true }).last(),
  ).toBeInViewport();
  const bounds = await dialog.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.width).toBeLessThanOrEqual(390);
  expect(
    await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth),
  ).toBe(true);
});

test("reloading while the announcement is open does not announce it twice", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem("release-open-reload")) return;
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("pulpit:last-seen-release:")) localStorage.removeItem(key);
    }
    for (const cookie of document.cookie.split(";")) {
      const name = cookie.split("=")[0].trim();
      if (name.startsWith("pulpit_release_seen_"))
        document.cookie = `${name}=; Max-Age=0; Path=/`;
    }
    sessionStorage.setItem("release-open-reload", "started");
  });
  await page.goto("/");
  const dialog = page.getByRole("dialog", { name: "What's new in PulpIT" });
  await expect(dialog).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Overview", level: 1 })).toBeVisible();
  await expect(dialog).toHaveCount(0);
});
