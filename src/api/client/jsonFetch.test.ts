import { afterEach, describe, expect, it, vi } from "vitest";
import { jsonFetch } from "./jsonFetch";

afterEach(() => {
  vi.unstubAllGlobals();
  document.cookie = "csrftoken=; Max-Age=0; path=/";
});

describe("same-origin JSON transport", () => {
  it.each([
    "https://example.invalid/api/",
    "//example.invalid/api/",
    "/\\example.invalid/",
    "/\u000a/remote",
  ])("blocks %s before sending credentials or CSRF headers", async (path) => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(jsonFetch(path, { method: "POST", body: "{}" })).rejects.toMatchObject({
      kind: "validation",
    });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("accepts same-origin absolute hrefs and preserves Headers instances", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{"ok":true}'));
    vi.stubGlobal("fetch", fetch);
    const headers = new Headers({ "X-Custom": "retained" });
    await expect(
      jsonFetch(`${location.origin}/pulp/api/v3/status/`, { headers }),
    ).resolves.toEqual({ ok: true });
    const [path, init] = fetch.mock.calls[0];
    expect(path).toBe("/pulp/api/v3/status/");
    expect(init.headers.get("X-Custom")).toBe("retained");
    expect(init.redirect).toBe("error");
    expect(init.credentials).toBe("same-origin");
  });
  it("sets CSRF for writes while leaving upload boundaries to the browser", async () => {
    document.cookie = "csrftoken=test-csrf; path=/";
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetch);
    const form = new FormData();
    form.set("file", new Blob(["test"]), "test.txt");
    await expect(
      jsonFetch("/pulp/api/v3/artifacts/", { method: "POST", body: form }),
    ).resolves.toBeUndefined();
    const init = fetch.mock.calls[0][1];
    expect(init.headers.get("X-CSRFToken")).toBe("test-csrf");
    expect(init.headers.has("Content-Type")).toBe(false);
  });
  it("normalizes backend and network errors", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response('{"detail":"Forbidden"}', { status: 403 }));
    vi.stubGlobal("fetch", fetch);
    await expect(jsonFetch("/pulp/api/v3/status/")).rejects.toMatchObject({
      kind: "forbidden",
    });
    fetch.mockRejectedValueOnce(new TypeError("Connection failed"));
    await expect(jsonFetch("/pulp/api/v3/status/")).rejects.toMatchObject({
      kind: "network",
    });
  });
});
