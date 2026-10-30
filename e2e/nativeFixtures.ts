import { expect, test, type Page } from "@playwright/test";

interface Resource {
  pulp_href: string;
  name?: string;
  latest_version_href?: string;
}

/** Own-resource fixtures only; never delete content deduplicated from an existing catalog. */
export async function nativeFixtures(page: Page) {
  page.setDefaultTimeout(15000);
  const cookies = await page.context().cookies();
  const headers = {
    "X-CSRFToken": cookies.find((cookie) => cookie.name === "csrftoken")?.value ?? "",
  };
  const resources: string[] = [];
  const wait = async (href: string) => {
    let task: { state: string; created_resources?: string[] } | undefined;
    await expect
      .poll(
        async () => {
          const response = await page.request.get(href, { timeout: 15000 });
          expect(response.ok()).toBeTruthy();
          task = await response.json();
          if (["failed", "canceled", "skipped"].includes(task!.state))
            throw new Error(`Fixture task ${task!.state}`);
          return task!.state;
        },
        { timeout: 60000 },
      )
      .toBe("completed");
    return task!;
  };
  const create = async (
    endpoint: string,
    data: Record<string, unknown>,
  ): Promise<Resource> => {
    expect(String(data.name)).toMatch(/^e2e-gui-/);
    const response = await page.request.post(endpoint, { headers, data, timeout: 15000 });
    expect([201, 202]).toContain(response.status());
    const value = await response.json();
    const resource = value.task
      ? await (
          await page.request.get((await wait(value.task)).created_resources![0])
        ).json()
      : value;
    resources.push(resource.pulp_href);
    return resource;
  };
  const remove = async (href: string) => {
    const response = await page.request.delete(href, { headers, timeout: 15000 });
    if (response.status() === 404) return;
    expect([202, 204]).toContain(response.status());
    if (response.status() === 202) await wait((await response.json()).task);
  };
  const cleanup = async () => {
    // Give teardown its own budget so a failed step cannot hide its cause
    // behind a second timeout or leave owned fixtures behind.
    test.info().setTimeout(test.info().timeout + 60000);
    for (const href of [...resources].reverse()) await remove(href);
  };
  return {
    headers,
    wait,
    create,
    remove,
    cleanup,
    remember: (href: string) => resources.push(href),
  };
}
