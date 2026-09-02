import { afterEach, describe, expect, it } from "vitest";

import { getCsrfToken } from "../api/auth/csrf";

function setCookie(value: string) {
  document.cookie = value;
}

function clearCookies() {
  document.cookie.split("; ").forEach((entry) => {
    const name = entry.split("=")[0];
    if (name) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }
  });
}

describe("getCsrfToken", () => {
  afterEach(() => clearCookies());

  it("returns undefined when no csrftoken cookie is present", () => {
    expect(getCsrfToken()).toBeUndefined();
  });

  it("reads the csrftoken cookie value", () => {
    setCookie("csrftoken=abc123");
    expect(getCsrfToken()).toBe("abc123");
  });

  it("finds csrftoken among multiple cookies", () => {
    setCookie("other=1");
    setCookie("csrftoken=xyz789");
    expect(getCsrfToken()).toBe("xyz789");
  });
});
