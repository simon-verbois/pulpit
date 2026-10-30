import { expect, test } from "@playwright/test";
import { nativeFixtures } from "./nativeFixtures";

const formats = [
  ["rpm", "rpm/rpm", "rpm/rpm"],
  ["ansible", "ansible/ansible", "ansible/ansible"],
  ["containers", "container/container", "container/container"],
  ["files", "file/file", "file/file"],
  ["deb", "deb/apt", "deb/apt"],
  ["python", "python/python", "python/pypi"],
  ["gems", "gem/gem", "gem/gem"],
  ["maven", "maven/maven", "maven/maven"],
  ["npm", "npm/npm", "npm/npm"],
  ["hugging-face", "hugging_face/hugging-face", "hugging_face/hugging-face"],
];

for (const [index, [route, repositoryType, distributionType]] of formats.entries()) {
  test(`${route}: deleting a repository also removes its distribution URLs`, async ({
    page,
  }) => {
    test.setTimeout(90000);
    const api = await nativeFixtures(page);
    const name = `e2e-gui-delete-${route}-${Date.now()}`;
    try {
      const repository = await api.create(
        `/pulp/api/v3/repositories/${repositoryType}/`,
        { name },
      );
      const base = `/pulp/api/v3/distributions/${distributionType}/`;
      const prefix = distributionType.split("/")[0].replace("_", "-");
      const latest = await api.create(base, {
        name: `${name}-latest`,
        base_path: `${prefix}/${name}-latest`,
        repository: repository.pulp_href,
      });
      const urls = [latest.pulp_href];
      if (route === "containers") {
        const pinned = await api.create(base, {
          name: `${name}-pinned`,
          base_path: `${prefix}/${name}-pinned`,
          repository_version: repository.latest_version_href,
        });
        urls.push(pinned.pulp_href);
      }
      if (route === "files") {
        const publication = await page.request.post(
          "/pulp/api/v3/publications/file/file/",
          {
            headers: api.headers,
            data: { repository_version: repository.latest_version_href },
          },
        );
        expect(publication.status()).toBe(202);
        const task = await api.wait((await publication.json()).task);
        const pinned = await api.create(base, {
          name: `${name}-pinned`,
          base_path: `${prefix}/${name}-pinned`,
          publication: task.created_resources![0],
        });
        urls.push(pinned.pulp_href);
      }
      await page.goto(`/${route}/repositories${index % 2 ? "" : `/${name}`}`);
      if (index % 2) {
        const row = page
          .getByRole("row")
          .filter({ has: page.getByRole("link", { name, exact: true }) });
        // The search also verifies deletion from a filtered repository list.
        if (!(await row.isVisible())) {
          await page.getByPlaceholder("Search by name…").fill(name);
          await page.getByPlaceholder("Search by name…").press("Enter");
        }
        await row
          .getByRole("button", { name: `Actions for ${name}`, exact: true })
          .click();
      } else await page.getByRole("button", { name: "Actions", exact: true }).click();
      await page
        .getByRole("menuitem", {
          name: index % 2 ? "Delete" : "Delete repository",
          exact: true,
        })
        .click();
      const dialog = page.getByRole("dialog", { name: "Delete repository?" });
      await expect(
        dialog.getByText(/Its distributions will also be deleted/),
      ).toBeVisible();
      await expect(dialog.getByText(/Distributions are kept/)).toHaveCount(0);
      const deleting = page.waitForResponse(
        (response) =>
          response.url().endsWith(repository.pulp_href) &&
          response.request().method() === "DELETE",
      );
      await dialog.getByRole("button", { name: "Delete", exact: true }).click();
      const accepted = await deleting;
      expect(accepted.status()).toBe(202);
      const task = (await accepted.json()).task;
      // Completion is owned by Pulp, even if this page disappears immediately.
      await page.goto("/");
      await api.wait(task);
      expect((await page.request.get(repository.pulp_href)).status()).toBe(404);
      for (const href of urls) expect((await page.request.get(href)).status()).toBe(404);
      // Names and paths are immediately reusable, without an orphan reconnect prompt.
      const replacement = await api.create(
        `/pulp/api/v3/repositories/${repositoryType}/`,
        { name },
      );
      const recreated = await api.create(base, {
        name: `${name}-latest`,
        base_path: `${prefix}/${name}-latest`,
        repository: replacement.pulp_href,
      });
      expect(recreated.pulp_href).not.toBe(latest.pulp_href);
    } finally {
      await api.cleanup();
    }
  });
}
