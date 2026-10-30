import { expect, test, type Page } from "@playwright/test";

async function csrfHeaders(page: Page) {
  const cookies = await page.context().cookies();
  return {
    "X-CSRFToken": cookies.find((cookie) => cookie.name === "csrftoken")?.value ?? "",
  };
}

async function waitForPulpTask(page: Page, href: string) {
  let state = "waiting";
  await expect
    .poll(
      async () => {
        const response = await page.request.get(href);
        expect(response.ok()).toBeTruthy();
        state = (await response.json()).state;
        return ["completed", "failed", "canceled", "skipped"].includes(state);
      },
      { timeout: 60_000 },
    )
    .toBe(true);
  return state;
}

test("manual retention purge waits for Pulp and refreshes diagnostics", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const settingsPath = "/pulpit-core/api/v1/task_retention/settings";
  const originalResponse = await page.request.get(settingsPath);
  expect(originalResponse.ok()).toBeTruthy();
  const original = await originalResponse.json();
  const headers = await csrfHeaders(page);
  try {
    // Keep all existing history, even on a populated development instance.
    const saved = await page.request.patch(settingsPath, {
      headers,
      data: { enabled: false, retention_days: 3650 },
    });
    expect(saved.status()).toBe(200);
    const candidates = await page.request.get("/pulp/api/v3/tasks/", {
      params: {
        limit: 1,
        finished_at__lt: new Date(Date.now() - 3649 * 86400_000).toISOString(),
        state__in: "completed,failed,canceled,skipped",
      },
    });
    expect(candidates.ok()).toBeTruthy();
    test.skip(
      (await candidates.json()).count > 0,
      "Existing tasks are too old for a harmless purge test",
    );

    await page.goto("/admin?tab=general");
    await page.getByRole("button", { name: "Purge now", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Purge task history?" })).toBeVisible();
    const queued = page.waitForResponse(
      (response) =>
        response.url().endsWith("/task_retention/purge") &&
        response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Purge", exact: true }).click();
    const response = await queued;
    expect(response.status()).toBe(202);
    const jobId = (await response.json()).id;
    await expect(page.getByText(/Purge completed/)).toBeVisible({ timeout: 60_000 });
    const job = await (
      await page.request.get(`/pulpit-core/api/v1/jobs/${jobId}`)
    ).json();
    expect(job.status).toBe("success");
    expect(await waitForPulpTask(page, job.result.pulp_task)).toBe("completed");
    const pulpTask = await (await page.request.get(job.result.pulp_task)).json();
    expect(
      pulpTask.progress_reports.find(
        (report: { code: string }) => report.code === "purge.tasks.key.core.Task",
      )?.done,
    ).toBe(0);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Close", exact: true })
      .last()
      .click();
    await expect(page.getByText(/^Last purge ran /)).toBeVisible();
    await page.getByRole("button", { name: "Tasks", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: /success job: Purge task history/ }),
    ).toBeVisible();
  } finally {
    const restored = await page.request.patch(settingsPath, {
      headers,
      data: { enabled: original.enabled, retention_days: original.retention_days },
    });
    expect(restored.status()).toBe(200);
  }
});

test("a repository page exposes a real failed sync", async ({ page }) => {
  test.setTimeout(120_000);
  const name = `e2e-sync-alert-${Date.now()}`;
  const headers = await csrfHeaders(page);
  let remoteHref: string | undefined;
  let repositoryHref: string | undefined;
  try {
    const remoteResponse = await page.request.post("/pulp/api/v3/remotes/file/file/", {
      headers,
      data: {
        name,
        url: `http://pulp/pulp/content/${name}/PULP_MANIFEST`,
        max_retries: 0,
        total_timeout: 10,
      },
    });
    expect(remoteResponse.status()).toBe(201);
    remoteHref = (await remoteResponse.json()).pulp_href;
    const repositoryResponse = await page.request.post(
      "/pulp/api/v3/repositories/file/file/",
      { headers, data: { name, remote: remoteHref } },
    );
    expect(repositoryResponse.status()).toBe(201);
    repositoryHref = (await repositoryResponse.json()).pulp_href;
    const sync = await page.request.post(`${repositoryHref}sync/`, {
      headers,
      data: { remote: remoteHref },
    });
    expect(sync.status()).toBe(202);
    const taskHref = (await sync.json()).task;
    expect(await waitForPulpTask(page, taskHref)).toBe("failed");
    await page.goto(`/files/repositories/${name}`);
    await expect(page.getByText(/Last sync failed:/)).toBeVisible();
    await expect(page.getByRole("link", { name: "View task details" })).toHaveAttribute(
      "href",
      `/tasks?task=${taskHref.split("/").filter(Boolean).pop()}`,
    );
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await expect(page.getByText(/Last sync failed:/)).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      ).toBe(true);
    }
  } finally {
    for (const href of [repositoryHref, remoteHref]) {
      if (!href) continue;
      const response = await page.request.delete(href, { headers });
      expect(response.status()).toBe(202);
      expect(await waitForPulpTask(page, (await response.json()).task)).toBe("completed");
    }
  }
});
