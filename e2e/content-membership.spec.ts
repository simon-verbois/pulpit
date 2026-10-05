import { expect, test } from "@playwright/test";

interface PageResult<T> {
  results: T[];
}

test("global content rows link to their current repositories", async ({ page }) => {
  test.setTimeout(60_000);
  const membershipRequests: string[] = [];
  const membershipFailures: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("/repositories/rpm/rpm/") && url.includes("latest_with_content=")) {
      membershipRequests.push(url);
    }
  });
  page.on("response", (response) => {
    const url = response.url();
    if (
      url.includes("/repositories/rpm/rpm/") &&
      url.includes("latest_with_content=") &&
      !response.ok()
    ) {
      membershipFailures.push(`${response.status()} ${url}`);
    }
  });

  const repositoriesResponse = await page.request.get(
    "/pulp/api/v3/repositories/rpm/rpm/?limit=100&fields=name,latest_version_href",
  );
  expect(repositoriesResponse.ok()).toBeTruthy();
  const repositories = (await repositoriesResponse.json()) as PageResult<{
    latest_version_href: string | null;
  }>;
  let currentPackageName: string | undefined;
  for (const repository of repositories.results) {
    if (!repository.latest_version_href) {
      continue;
    }
    const params = new URLSearchParams({
      repository_version: repository.latest_version_href,
      fields: "name",
      limit: "1",
    });
    const contentResponse = await page.request.get(
      `/pulp/api/v3/content/rpm/packages/?${params.toString()}`,
    );
    const content = (await contentResponse.json()) as PageResult<{ name: string }>;
    currentPackageName = content.results[0]?.name;
    if (currentPackageName) {
      break;
    }
  }
  expect(currentPackageName).toBeTruthy();

  await page.goto("/rpm/packages");
  await expect(
    page.getByRole("heading", { name: "RPM packages", level: 1 }),
  ).toBeVisible();
  await page.getByLabel("Search packages by name").fill(currentPackageName ?? "");
  await page.getByRole("button", { name: "Search" }).click();

  const table = page.getByRole("grid", { name: "RPM packages" });
  await expect(table.getByRole("columnheader", { name: "Repositories" })).toBeVisible();
  const repositoryLink = table.getByRole("link").first();
  await expect(repositoryLink).toBeVisible({ timeout: 20_000 });
  expect(membershipRequests.length).toBeGreaterThan(0);
  expect(membershipFailures).toEqual([]);

  const repositoryName = await repositoryLink.textContent();
  await repositoryLink.click();
  await expect(page).toHaveURL(
    new RegExp(`/rpm/repositories/${encodeURIComponent(repositoryName ?? "")}$`),
  );
});

test("repository membership remains visible at a narrower viewport", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 700 });
  await page.goto("/rpm/packages");

  const table = page.getByRole("grid", { name: "RPM packages" });
  await expect(table.getByRole("columnheader", { name: "Repositories" })).toBeVisible();
  await expect(table.getByText("Repositories", { exact: true }).last()).toBeVisible();
});
