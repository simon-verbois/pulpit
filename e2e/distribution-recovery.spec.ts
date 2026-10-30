import { expect, test } from "@playwright/test";

test("a legacy orphan RPM distribution can be reconnected to a recreated repository", async ({
  page,
}) => {
  test.setTimeout(90000);
  const name = `e2e-distribution-recovery-${Date.now()}`;
  const cookies = await page.context().cookies();
  const headers = {
    "X-CSRFToken": cookies.find((cookie) => cookie.name === "csrftoken")?.value ?? "",
  };
  const wait = async (href: string) => {
    await expect
      .poll(
        async () => {
          const response = await page.request.get(href);
          expect(response.ok()).toBeTruthy();
          const task = await response.json();
          if (["failed", "canceled", "skipped"].includes(task.state))
            throw new Error(`Fixture operation ${task.state}`);
          return task.state;
        },
        { timeout: 45000 },
      )
      .toBe("completed");
  };
  let repositoryHref: string | undefined;
  let distributionHref: string | undefined;
  try {
    const original = await page.request.post("/pulp/api/v3/repositories/rpm/rpm/", {
      headers,
      data: { name },
    });
    expect(original.status()).toBe(201);
    repositoryHref = (await original.json()).pulp_href;
    const created = await page.request.post("/pulp/api/v3/distributions/rpm/rpm/", {
      headers,
      data: { name, base_path: `rpm/${name}`, repository: repositoryHref },
    });
    expect(created.status()).toBe(202);
    await wait((await created.json()).task);
    const list = await page.request.get("/pulp/api/v3/distributions/rpm/rpm/", {
      params: { name },
    });
    distributionHref = (await list.json()).results[0].pulp_href;
    // Simulate a legacy orphan without relying on the old repository-delete behavior.
    const detached = await page.request.patch(distributionHref!, {
      headers,
      data: { repository: null, publication: null },
    });
    expect(detached.status()).toBe(202);
    await wait((await detached.json()).task);
    const deletion = await page.request.delete(repositoryHref!, { headers });
    await wait((await deletion.json()).task);
    repositoryHref = undefined;
    const replacement = await page.request.post("/pulp/api/v3/repositories/rpm/rpm/", {
      headers,
      data: { name },
    });
    repositoryHref = (await replacement.json()).pulp_href;

    await page.goto(`/rpm/repositories/${name}?tab=distributions`);
    await page.getByRole("button", { name: "Create distribution" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Create", exact: true }).click();
    await expect(
      dialog.getByRole("button", { name: "Reconnect", exact: true }),
    ).toBeVisible();
    await expect(dialog.getByText(/no longer serves any content/)).toBeVisible();
    const reconnect = page.waitForResponse(
      (response) =>
        response.url().endsWith(distributionHref!) &&
        response.request().method() === "PATCH",
    );
    await dialog.getByRole("button", { name: "Reconnect", exact: true }).click();
    const response = await reconnect;
    expect(response.status()).toBe(202);
    await wait((await response.json()).task);
    await expect(dialog).toBeHidden();
    const distribution = await (await page.request.get(distributionHref!)).json();
    expect(distribution.repository).toBe(repositoryHref);
    const count = await (
      await page.request.get("/pulp/api/v3/distributions/rpm/rpm/", { params: { name } })
    ).json();
    expect(count.count).toBe(1);
  } finally {
    if (distributionHref) {
      const result = await page.request.delete(distributionHref, { headers });
      if (result.ok()) await wait((await result.json()).task);
    }
    if (repositoryHref) {
      const result = await page.request.delete(repositoryHref, { headers });
      if (result.ok()) await wait((await result.json()).task);
    }
  }
});
