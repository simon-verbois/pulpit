import { expect, test } from "@playwright/test";

test("global proxy saves once and remote forms expose only origin credentials", async ({
  page,
}) => {
  await page.goto("/admin?tab=default-settings");
  const proxyTab = page.getByRole("tab", { name: "Global Proxy Settings" });
  await proxyTab.click();
  await expect(page.getByLabel("Proxy URL", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Apply to all remotes/ })).toHaveCount(0);
  const input = page.getByLabel("Proxy URL", { exact: true });
  const previous = await input.inputValue();
  const temporary =
    previous === "http://127.0.0.1:31289"
      ? "http://127.0.0.1:31290"
      : "http://127.0.0.1:31289";
  await input.fill(temporary);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Success alert: Global network policy saved" }),
  ).toBeVisible();
  await page.reload();
  await proxyTab.click();
  await expect(input).toHaveValue(temporary);
  await input.fill(previous);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Success alert: Global network policy saved" }),
  ).toBeVisible();
  await page.goto("/rpm/remotes");
  await page.getByRole("button", { name: "Create remote", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("button", { name: "Advanced connection settings", exact: true })
    .click();
  await expect(dialog.getByText(/managed centrally/)).toBeVisible();
  await expect(
    dialog.getByLabel("Origin server username", { exact: true }),
  ).toBeVisible();
  for (const label of [
    "Proxy URL",
    "Proxy username",
    "Proxy password",
    "Trusted CA certificate (PEM)",
  ]) {
    await expect(dialog.getByLabel(label, { exact: true })).toHaveCount(0);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    dialog.getByLabel("Origin server password", { exact: true }),
  ).toBeVisible();
  await expect(dialog).toBeVisible();
});
