import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { nativeFixtures } from "./nativeFixtures";

const formats = [
  { route: "ansible", repository: "ansible/ansible", distribution: "ansible/ansible" },
  {
    route: "containers",
    repository: "container/container",
    distribution: "container/container",
  },
  { route: "files", repository: "file/file", distribution: "file/file" },
  { route: "deb", repository: "deb/apt", distribution: "deb/apt" },
  { route: "python", repository: "python/python", distribution: "python/pypi" },
  { route: "gems", repository: "gem/gem", distribution: "gem/gem" },
  { route: "maven", repository: "maven/maven", distribution: "maven/maven" },
  { route: "npm", repository: "npm/npm", distribution: "npm/npm" },
  {
    route: "hugging-face",
    repository: "hugging_face/hugging-face",
    distribution: "hugging_face/hugging-face",
  },
];

for (const format of formats)
  test(`${format.route}: edit and reconnect distributions without losing access settings`, async ({
    page,
  }) => {
    test.setTimeout(150000);
    const api = await nativeFixtures(page);
    const name = `e2e-gui-${format.route}-${Date.now()}`;
    const base = `/pulp/api/v3/distributions/${format.distribution}/`;
    try {
      const guard = await api.create(
        format.route === "containers"
          ? "/pulp/api/v3/contentguards/core/content_redirect/"
          : "/pulp/api/v3/contentguards/core/header/",
        {
          name: `${name}-guard`,
          ...(format.route === "containers"
            ? {}
            : { header_name: "X-Pulpit-Test", header_value: "fixture" }),
        },
      );
      let repository = await api.create(
        `/pulp/api/v3/repositories/${format.repository}/`,
        { name },
      );
      await page.goto(`/${format.route}/repositories/${name}?tab=distributions`);
      await page
        .getByRole("button", { name: "Create distribution", exact: true })
        .first()
        .click();
      let dialog = page.getByRole("dialog");
      await dialog.getByLabel("Base path", { exact: false }).fill(name);
      await dialog.getByLabel("Name", { exact: false }).fill(`${name}-dist`);
      await dialog.getByRole("button", { name: "Access and visibility" }).click();
      if (guard)
        await dialog
          .getByLabel("Content guard", { exact: false })
          .selectOption({ label: `${name}-guard` });
      if (format.route === "containers")
        await dialog.getByLabel("Private", { exact: true }).check();
      await dialog.getByLabel("Hide from content directory listings").check();
      await page.setViewportSize({ width: 390, height: 900 });
      expect(
        await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth),
      ).toBe(true);
      await page.setViewportSize({ width: 1280, height: 720 });
      const creating = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === base &&
          response.request().method() === "POST",
      );
      await dialog.getByRole("button", { name: "Create", exact: true }).click();
      const created = await creating;
      expect(created.status()).toBe(202);
      const task = await api.wait((await created.json()).task);
      const href = task.created_resources!.find((resource) => resource.startsWith(base))!;
      api.remember(href);
      await expect(dialog).toBeHidden();
      const row = page.getByRole("row").filter({
        has: page.getByRole("gridcell", { name: `${name}-dist`, exact: true }),
      });
      await expect(row).toBeVisible();
      await row.getByRole("button", { name: "Edit", exact: true }).click();
      dialog = page.getByRole("dialog");
      if (guard)
        await expect(dialog.getByLabel("Content guard", { exact: false })).toHaveValue(
          guard.pulp_href,
        );
      else await expect(dialog.getByLabel("Private", { exact: true })).toBeChecked();
      await dialog.getByLabel("Name", { exact: false }).fill(`${name}-renamed`);
      const editing = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === href &&
          response.request().method() === "PATCH",
      );
      await dialog.getByRole("button", { name: "Save", exact: true }).click();
      expect((await editing).status()).toBe(202);
      await api.wait((await (await editing).json()).task);
      await expect(dialog).toBeHidden();
      // Legacy orphan fixture: new repository deletions now remove attached URLs.
      const detached = await page.request.patch(href, {
        headers: api.headers,
        data: {
          repository: null,
          content_guard: guard.pulp_href,
          hidden: true,
          ...(format.route === "containers" ? { private: true } : {}),
        },
      });
      expect(detached.status()).toBe(202);
      await api.wait((await detached.json()).task);
      await api.remove(repository.pulp_href);
      repository = await api.create(`/pulp/api/v3/repositories/${format.repository}/`, {
        name,
      });
      await page.reload();
      await page
        .getByRole("button", { name: "Create distribution", exact: true })
        .first()
        .click();
      dialog = page.getByRole("dialog");
      await dialog.getByLabel("Base path", { exact: false }).fill(name);
      await dialog.getByLabel("Name", { exact: false }).fill(`${name}-renamed`);
      await dialog.getByRole("button", { name: "Create", exact: true }).click();
      await expect(
        dialog.getByRole("button", { name: "Reconnect", exact: true }),
      ).toBeVisible();
      if (guard)
        await expect(dialog.getByLabel("Content guard", { exact: false })).toHaveValue(
          guard.pulp_href,
        );
      else await expect(dialog.getByLabel("Private", { exact: true })).toBeChecked();
      const reconnecting = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === href &&
          response.request().method() === "PATCH",
      );
      await dialog.getByRole("button", { name: "Reconnect", exact: true }).click();
      const result = await reconnecting;
      expect(result.status()).toBe(202);
      await api.wait((await result.json()).task);
      const restored = await (await page.request.get(href)).json();
      expect(restored.repository).toBe(repository.pulp_href);
      if (guard) expect(restored.content_guard).toBe(guard.pulp_href);
      else expect(restored.private).toBe(true);
      expect(restored.hidden).toBe(true);
    } finally {
      await api.cleanup();
    }
  });

test("RPM search resets pagination before submitting its new filter", async ({
  page,
}) => {
  await page.goto("/rpm/packages");
  await page.getByRole("button", { name: "Go to next page", exact: true }).click();
  await page.getByLabel("Search packages by name").fill("walrus");
  const request = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname.endsWith("/content/rpm/packages/") &&
      new URL(response.url()).searchParams.get("name__contains") === "walrus",
  );
  await page.getByLabel("Search packages by name").press("Enter");
  const response = await request;
  expect(new URL(response.url()).searchParams.get("offset")).toBe("0");
  await expect(
    page.getByRole("gridcell", { name: "walrus", exact: true }).first(),
  ).toBeVisible();
});

test("RPM can selectively copy a retained older version and submit advanced sync options", async ({
  page,
}) => {
  test.setTimeout(150000);
  const api = await nativeFixtures(page);
  const name = `e2e-gui-rpm-copy-${Date.now()}`;
  try {
    const source = await api.create("/pulp/api/v3/repositories/rpm/rpm/", { name });
    const destination = await api.create("/pulp/api/v3/repositories/rpm/rpm/", {
      name: `${name}-destination`,
    });
    const uploaded = await page.request.post(
      "/pulp/api/v3/content/rpm/packages/upload/",
      {
        headers: api.headers,
        multipart: {
          file: {
            name: "walrus.rpm",
            mimeType: "application/x-rpm",
            buffer: readFileSync("e2e/fixtures/walrus-5.21-1.noarch.rpm"),
          },
        },
      },
    );
    expect(uploaded.ok()).toBeTruthy();
    const packageHref = (await uploaded.json()).pulp_href;
    for (const data of [
      { add_content_units: [packageHref] },
      { remove_content_units: [packageHref] },
    ]) {
      const modifying = await page.request.post(`${source.pulp_href}modify/`, {
        headers: api.headers,
        data,
      });
      expect(modifying.status()).toBe(202);
      await api.wait((await modifying.json()).task);
    }
    await page.goto(`/rpm/repositories/${name}?tab=versions`);
    const version = page.getByRole("row").filter({ hasText: "Version 1" });
    await version.getByRole("button", { name: "Copy to…" }).click();
    let dialog = page.getByRole("dialog");
    await dialog
      .getByLabel("Destination repository", { exact: false })
      .selectOption(destination.pulp_href);
    await dialog.getByLabel("Selected content", { exact: true }).check();
    await dialog.getByRole("checkbox", { name: /Select walrus/ }).check();
    await dialog.getByLabel("Include dependencies", { exact: true }).uncheck();
    const copying = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname.endsWith("/rpm/copy/") &&
        response.request().method() === "POST",
    );
    await dialog.getByRole("button", { name: "Copy", exact: true }).click();
    const copyResponse = await copying;
    expect(copyResponse.status()).toBe(202);
    expect(copyResponse.request().postDataJSON()).toMatchObject({
      config: [
        {
          source_repo_version: `${source.pulp_href}versions/1/`,
          dest_repo: destination.pulp_href,
          content: [packageHref],
        },
      ],
      dependency_solving: false,
    });
    await api.wait((await copyResponse.json()).task);
    const current = await (await page.request.get(destination.pulp_href)).json();
    const packages = await (
      await page.request.get("/pulp/api/v3/content/rpm/packages/", {
        params: { repository_version: current.latest_version_href },
      })
    ).json();
    expect(packages.count).toBe(1);
    await page.getByRole("button", { name: "Actions", exact: true }).click();
    await page.getByRole("menuitem", { name: "Sync with options…" }).click();
    dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("button", { name: "Synchronize", exact: true }),
    ).toBeDisabled();
    await dialog
      .getByLabel("Synchronization mode", { exact: false })
      .selectOption("mirror_content_only");
    await expect(
      dialog.getByLabel("I confirm this repository should match the remote"),
    ).toBeVisible();
    const remote = await api.create("/pulp/api/v3/remotes/rpm/rpm/", {
      name: `${name}-remote`,
      url: "https://fixtures.pulpproject.org/rpm-unsigned/",
      policy: "on_demand",
    });
    // Refresh the picker after creating a remote outside this browser form.
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.reload();
    await page.getByRole("button", { name: "Actions", exact: true }).click();
    await page.getByRole("menuitem", { name: "Sync with options…" }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByLabel("Remote", { exact: true }).selectOption(remote.pulp_href);
    await dialog
      .getByLabel("Synchronization mode", { exact: false })
      .selectOption("mirror_content_only");
    await dialog.getByLabel("Skip source RPMs").check();
    await dialog.getByLabel("Skip distribution tree information").check();
    await dialog.getByLabel("Optimize unchanged content").uncheck();
    await expect(
      dialog.getByRole("button", { name: "Synchronize", exact: true }),
    ).toBeDisabled();
    await dialog.getByLabel("I confirm this repository should match the remote").check();
    const syncing = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === `${source.pulp_href}sync/` &&
        response.request().method() === "POST",
    );
    await dialog.getByRole("button", { name: "Synchronize", exact: true }).click();
    const synced = await syncing;
    expect(synced.status()).toBe(202);
    expect(synced.request().postDataJSON()).toMatchObject({
      remote: remote.pulp_href,
      sync_policy: "mirror_content_only",
      optimize: false,
      skip_types: ["srpm", "treeinfo"],
    });
    await api.wait((await synced.json()).task);
    expect((await (await page.request.get(source.pulp_href)).json()).remote).toBeNull();
  } finally {
    await api.cleanup();
  }
});

test("File version pinning serves immutable content behind its configured guard", async ({
  page,
}) => {
  test.setTimeout(150000);
  const api = await nativeFixtures(page);
  const name = `e2e-gui-file-pin-${Date.now()}`;
  try {
    const repository = await api.create("/pulp/api/v3/repositories/file/file/", { name });
    const guard = await api.create("/pulp/api/v3/contentguards/core/header/", {
      name: `${name}-guard`,
      header_name: "X-Pulpit-Test",
      header_value: "fixture",
    });
    const upload = await page.request.post("/pulp/api/v3/content/file/files/upload/", {
      headers: api.headers,
      multipart: {
        file: { name: "example.txt", mimeType: "text/plain", buffer: Buffer.from(name) },
        relative_path: "example.txt",
      },
    });
    expect(upload.ok()).toBeTruthy();
    const contentHref = (await upload.json()).pulp_href;
    const modified = await page.request.post(`${repository.pulp_href}modify/`, {
      headers: api.headers,
      data: { add_content_units: [contentHref] },
    });
    await api.wait((await modified.json()).task);
    await page.goto(`/files/repositories/${name}?tab=distributions`);
    await page
      .getByRole("button", { name: "Create distribution", exact: true })
      .first()
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Base path", { exact: false }).fill(name);
    await dialog.getByLabel("Pin a repository version", { exact: true }).check();
    await expect(dialog.getByLabel("Repository version", { exact: true })).toContainText(
      "Version 1",
    );
    await dialog.getByRole("button", { name: "Access and visibility" }).click();
    await dialog
      .getByLabel("Content guard", { exact: false })
      .selectOption(guard.pulp_href);
    const creating = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/pulp/api/v3/distributions/file/file/" &&
        response.request().method() === "POST",
    );
    await dialog.getByRole("button", { name: "Create", exact: true }).click();
    const result = await creating;
    expect(result.status()).toBe(202);
    const task = await api.wait((await result.json()).task);
    const href = task.created_resources!.find((resource) =>
      resource.includes("/distributions/"),
    )!;
    api.remember(href);
    const distribution = await (await page.request.get(href)).json();
    expect(distribution.repository).toBeNull();
    expect(distribution.publication).toContain("/publications/file/file/");
    const contentUrl = `/pulp/content/${distribution.base_path}/example.txt`;
    expect((await page.request.get(contentUrl)).status()).toBe(403);
    const signedHeader = { "X-Pulpit-Test": Buffer.from("fixture").toString("base64") };
    expect(
      await (await page.request.get(contentUrl, { headers: signedHeader })).text(),
    ).toBe(name);
    const removed = await page.request.post(`${repository.pulp_href}modify/`, {
      headers: api.headers,
      data: { remove_content_units: [contentHref] },
    });
    await api.wait((await removed.json()).task);
    await page.reload();
    await expect(page.getByRole("gridcell", { name, exact: true })).toBeVisible();
    expect(
      await (await page.request.get(contentUrl, { headers: signedHeader })).text(),
    ).toBe(name);
  } finally {
    await api.cleanup();
  }
});

test("Container copy retries only a rejected submission, and a distribution can pin its version", async ({
  page,
}) => {
  test.setTimeout(180000);
  const api = await nativeFixtures(page);
  const name = `e2e-gui-container-copy-${Date.now()}`;
  try {
    const remote = await api.create("/pulp/api/v3/remotes/container/container/", {
      name: `${name}-remote`,
      url: "https://ghcr.io",
      upstream_name: "pulp/hello-world",
      includes: ["latest"],
      policy: "on_demand",
    });
    const source = await api.create("/pulp/api/v3/repositories/container/container/", {
      name,
      remote: remote.pulp_href,
    });
    const destination = await api.create(
      "/pulp/api/v3/repositories/container/container/",
      { name: `${name}-destination` },
    );
    await page.goto(`/containers/repositories/${name}`);
    await page.getByRole("button", { name: "Actions", exact: true }).click();
    await page.getByRole("menuitem", { name: "Sync with options…" }).click();
    let dialog = page.getByRole("dialog");
    await dialog
      .getByLabel("Synchronization mode", { exact: false })
      .selectOption("additive");
    await expect(dialog.getByText(/does not verify their validity/)).toBeVisible();
    const syncing = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === `${source.pulp_href}sync/` &&
        response.request().method() === "POST",
    );
    await dialog.getByRole("button", { name: "Synchronize", exact: true }).click();
    const synced = await syncing;
    expect(synced.status()).toBe(202);
    expect(synced.request().postDataJSON()).toMatchObject({
      mirror: false,
      signed_only: false,
    });
    await api.wait((await synced.json()).task);
    let tagRequests = 0;
    let rejectManifest = true;
    await page.route(`**${destination.pulp_href}copy_tags/`, async (route) => {
      tagRequests++;
      await route.continue();
    });
    await page.route(`**${destination.pulp_href}copy_manifests/`, async (route) => {
      if (rejectManifest) {
        rejectManifest = false;
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ detail: "Controlled manifest submission failure" }),
        });
      } else await route.continue();
    });
    await page.goto(`/containers/repositories/${name}?tab=versions`);
    await page
      .getByRole("row")
      .filter({ hasText: "Version 1" })
      .getByRole("button", { name: "Copy to…" })
      .click();
    dialog = page.getByRole("dialog");
    await dialog
      .getByLabel("Destination repository", { exact: false })
      .selectOption(destination.pulp_href);
    const tags = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === `${destination.pulp_href}copy_tags/` &&
        response.request().method() === "POST",
    );
    await dialog.getByRole("button", { name: "Copy", exact: true }).click();
    const tagged = await tags;
    expect(tagged.status()).toBe(202);
    await expect(dialog.getByText(/Accepted requests continue in Tasks/)).toBeVisible();
    const manifests = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === `${destination.pulp_href}copy_manifests/` &&
        response.status() === 202,
    );
    await dialog.getByRole("button", { name: "Copy", exact: true }).click();
    const manifest = await manifests;
    await expect(dialog).toBeHidden();
    await api.wait((await tagged.json()).task);
    await api.wait((await manifest.json()).task);
    expect(tagRequests).toBe(1);
    for (const mode of ["tags", "manifests"] as const) {
      await page
        .getByRole("row")
        .filter({ hasText: "Version 1" })
        .getByRole("button", { name: "Copy to…" })
        .click();
      dialog = page.getByRole("dialog");
      await dialog
        .getByLabel("Destination repository", { exact: false })
        .selectOption(destination.pulp_href);
      await dialog
        .getByLabel(
          mode === "tags" ? "Selected tags" : "Selected manifests or media types",
          { exact: true },
        )
        .check();
      const choice = dialog
        .getByRole("checkbox", {
          name: mode === "tags" ? "Select latest" : /^Select sha256:/,
        })
        .first();
      await choice.check();
      const label = await choice.getAttribute("aria-label");
      const identifier = label!.split(" · ")[0].replace(/^Select /, "");
      const mediaType = label!.split(" · ")[1];
      if (mode === "manifests")
        await dialog.getByLabel(mediaType, { exact: true }).check();
      await page.setViewportSize({ width: 390, height: 900 });
      expect(
        await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth),
      ).toBe(true);
      await page.setViewportSize({ width: 1280, height: 720 });
      const submitting = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === `${destination.pulp_href}copy_${mode}/` &&
          response.request().method() === "POST",
      );
      await dialog.getByRole("button", { name: "Copy", exact: true }).click();
      const submitted = await submitting;
      expect(submitted.status()).toBe(202);
      expect(submitted.request().postDataJSON()).toMatchObject(
        mode === "tags"
          ? { names: [identifier] }
          : { digests: [identifier], media_types: [mediaType] },
      );
      await api.wait((await submitted.json()).task);
      await expect(dialog).toBeHidden();
    }
    await page.getByRole("tab", { name: "Distributions", exact: true }).click();
    await page
      .getByRole("button", { name: "Create distribution", exact: true })
      .first()
      .click();
    dialog = page.getByRole("dialog");
    await dialog.getByLabel("Base path", { exact: false }).fill(name);
    await dialog.getByLabel("Pin a repository version", { exact: true }).check();
    await expect(dialog.getByLabel("Repository version", { exact: true })).toContainText(
      "Version 1",
    );
    const creating = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname ===
          "/pulp/api/v3/distributions/container/container/" &&
        response.request().method() === "POST",
    );
    await dialog.getByRole("button", { name: "Create", exact: true }).click();
    const created = await creating;
    expect(created.status()).toBe(202);
    const task = await api.wait((await created.json()).task);
    const href = task.created_resources!.find((resource) =>
      resource.includes("/distributions/"),
    )!;
    api.remember(href);
    const distribution = await (await page.request.get(href)).json();
    expect(distribution.repository).toBeNull();
    expect(distribution.repository_version).toBe(`${source.pulp_href}versions/1/`);
    await page.reload();
    await expect(page.getByRole("gridcell", { name, exact: true })).toBeVisible();
    const pinnedRow = page
      .getByRole("row")
      .filter({ has: page.getByRole("gridcell", { name, exact: true }) });
    await pinnedRow.getByRole("button", { name: "Delete", exact: true }).click();
    const deletingDialog = page.getByRole("dialog");
    await expect(deletingDialog.getByText(/also deletes/)).toHaveCount(0);
    const deleting = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === href &&
        response.request().method() === "DELETE",
    );
    await deletingDialog.getByRole("button", { name: "Delete", exact: true }).click();
    await api.wait((await (await deleting).json()).task);
    expect((await page.request.get(source.pulp_href)).status()).toBe(200);
    await expect(page).toHaveURL(new RegExp(`/containers/repositories/${name}`));
  } finally {
    await api.cleanup();
  }
});

test("Ansible copies selected collection content from an older version and pins that version", async ({
  page,
}) => {
  test.setTimeout(150000);
  const api = await nativeFixtures(page);
  const name = `e2e-gui-ansible-copy-${Date.now()}`;
  try {
    const source = await api.create("/pulp/api/v3/repositories/ansible/ansible/", {
      name,
    });
    const destination = await api.create("/pulp/api/v3/repositories/ansible/ansible/", {
      name: `${name}-destination`,
    });
    const upload = await page.request.post(
      "/pulp/api/v3/content/ansible/collection_versions/",
      {
        headers: api.headers,
        multipart: {
          file: {
            name: "pulpit_test-demo-1.0.0.tar.gz",
            mimeType: "application/gzip",
            buffer: readFileSync("e2e/fixtures/pulpit_test-demo-1.0.0.tar.gz"),
          },
          repository: source.pulp_href,
        },
      },
    );
    expect(upload.status()).toBe(202);
    await api.wait((await upload.json()).task);
    const collections = await (
      await page.request.get("/pulp/api/v3/content/ansible/collection_versions/", {
        params: { repository_version: `${source.pulp_href}versions/1/` },
      })
    ).json();
    expect(collections.count).toBe(1);
    const content = collections.results[0].pulp_href;
    const modifying = await page.request.post(`${source.pulp_href}modify/`, {
      headers: api.headers,
      data: { remove_content_units: [content] },
    });
    await api.wait((await modifying.json()).task);
    await page.goto(`/ansible/repositories/${name}?tab=versions`);
    await page
      .getByRole("row")
      .filter({ hasText: "Version 1" })
      .getByRole("button", { name: "Copy to…" })
      .click();
    let dialog = page.getByRole("dialog");
    await dialog
      .getByLabel("Destination repository", { exact: false })
      .selectOption(destination.pulp_href);
    await dialog.getByLabel("Selected content", { exact: true }).check();
    await dialog.getByRole("checkbox", { name: /Select pulpit_test.*demo/ }).check();
    const copying = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname.endsWith("/ansible/copy/") &&
        response.request().method() === "POST",
    );
    await dialog.getByRole("button", { name: "Copy", exact: true }).click();
    const copied = await copying;
    expect(copied.status()).toBe(202);
    expect(copied.request().postDataJSON()).toMatchObject({
      config: [
        { source_repo_version: `${source.pulp_href}versions/1/`, content: [content] },
      ],
    });
    await api.wait((await copied.json()).task);
    await page.getByRole("tab", { name: "Distributions", exact: true }).click();
    await page
      .getByRole("button", { name: "Create distribution", exact: true })
      .first()
      .click();
    dialog = page.getByRole("dialog");
    await dialog.getByLabel("Base path", { exact: false }).fill(name);
    await dialog.getByLabel("Pin a repository version", { exact: true }).check();
    await dialog
      .getByLabel("Repository version", { exact: true })
      .selectOption(`${source.pulp_href}versions/1/`);
    const creating = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname ===
          "/pulp/api/v3/distributions/ansible/ansible/" &&
        response.request().method() === "POST",
    );
    await dialog.getByRole("button", { name: "Create", exact: true }).click();
    const created = await creating;
    expect(created.status()).toBe(202);
    const task = await api.wait((await created.json()).task);
    const href = task.created_resources!.find((resource) =>
      resource.includes("/distributions/"),
    )!;
    api.remember(href);
    const distribution = await (await page.request.get(href)).json();
    expect(distribution.repository_version).toBe(`${source.pulp_href}versions/1/`);
    await page.reload();
    await expect(page.getByRole("gridcell", { name, exact: true })).toBeVisible();
  } finally {
    await api.cleanup();
  }
});

test("Prune tracks the native task group and links to all its child tasks", async ({
  page,
}) => {
  test.setTimeout(120000);
  const api = await nativeFixtures(page);
  const name = `e2e-gui-prune-${Date.now()}`;
  try {
    await api.create("/pulp/api/v3/repositories/rpm/rpm/", { name });
    await api.create("/pulp/api/v3/repositories/rpm/rpm/", { name: `${name}-second` });
    await page.goto("/rpm/repositories");
    await page.getByRole("button", { name: "Prune packages…", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(name, { exact: true }).check();
    await dialog.getByLabel(`${name}-second`, { exact: true }).check();
    const pruning = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname.endsWith("/rpm/prune/") &&
        response.request().method() === "POST",
    );
    await dialog.getByRole("button", { name: "Run dry run", exact: true }).click();
    const accepted = await pruning;
    expect(accepted.status()).toBe(202);
    const groupHref = (await accepted.json()).task_group;
    await expect(dialog).toBeHidden();
    await page.getByRole("button", { name: /^Tasks/ }).click();
    await page.getByRole("heading", { name: /Prune packages \(dry run\)/ }).click();
    await expect(page).toHaveURL(new RegExp(`group=${encodeURIComponent(groupHref)}`));
    await expect(page.getByText(/Task group: completed/)).toBeVisible({ timeout: 60000 });
    const group = await (await page.request.get(groupHref)).json();
    expect(group.all_tasks_dispatched).toBe(true);
    expect(group.tasks.length).toBeGreaterThan(0);
    expect(
      group.tasks.every((task: { state: string }) =>
        ["completed", "skipped"].includes(task.state),
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Show all tasks", exact: true }).click();
    await expect(page).not.toHaveURL(/group=/);
  } finally {
    await api.cleanup();
  }
});
