import { describe, expect, it } from "vitest";

import { evaluatePasswordPolicy, generateStrongPassword } from "./passwordPolicy";

describe("evaluatePasswordPolicy", () => {
  it("flags a password shorter than 8 characters", () => {
    const { results, isValid } = evaluatePasswordPolicy("short1");
    expect(isValid).toBe(false);
    expect(results.find((r) => r.rule.id === "min-length")?.passed).toBe(false);
  });

  it("flags an entirely numeric password", () => {
    const { results, isValid } = evaluatePasswordPolicy("12345678");
    expect(isValid).toBe(false);
    expect(results.find((r) => r.rule.id === "not-numeric")?.passed).toBe(false);
  });

  it("flags a password too similar to the username", () => {
    const { results, isValid } = evaluatePasswordPolicy("alice12345", {
      username: "alice",
    });
    expect(isValid).toBe(false);
    expect(results.find((r) => r.rule.id === "not-similar")?.passed).toBe(false);
  });

  it("flags a password too similar to the email's local part", () => {
    const { results } = evaluatePasswordPolicy("bobsmith99", {
      email: "bobsmith@example.com",
    });
    expect(results.find((r) => r.rule.id === "not-similar")?.passed).toBe(false);
  });

  it("flags a commonly used password", () => {
    const { results, isValid } = evaluatePasswordPolicy("password123");
    expect(isValid).toBe(false);
    expect(results.find((r) => r.rule.id === "not-common")?.passed).toBe(false);
  });

  it("passes a password that satisfies every rule", () => {
    const { isValid } = evaluatePasswordPolicy("Tr0ub4dor&Zebra", {
      username: "alice",
      email: "alice@example.com",
    });
    expect(isValid).toBe(true);
  });

  it("does not flag the not-numeric rule for an empty password", () => {
    const { results } = evaluatePasswordPolicy("");
    expect(results.find((r) => r.rule.id === "not-numeric")?.passed).toBe(true);
  });
});

describe("generateStrongPassword", () => {
  it("always satisfies the full policy", () => {
    for (let i = 0; i < 50; i += 1) {
      const password = generateStrongPassword();
      const { isValid } = evaluatePasswordPolicy(password, {
        username: "admin",
        email: "admin@example.com",
      });
      expect(isValid).toBe(true);
    }
  });

  it("defaults to 16 characters and never repeats twice in a row", () => {
    const a = generateStrongPassword();
    const b = generateStrongPassword();
    expect(a).toHaveLength(16);
    expect(a).not.toBe(b);
  });
});
