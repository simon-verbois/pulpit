import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PULPIT_BASE_URL ?? "http://localhost:8080";
const AUTH_STATE_PATH = "playwright/.auth/admin.json";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: "auth",
      testMatch: /auth\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
      // Deliberately no storageState/dependency: this spec exercises the
      // login/logout UI itself, so it must start unauthenticated.
    },
    {
      name: "chromium",
      testIgnore: /auth\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], storageState: AUTH_STATE_PATH },
      dependencies: ["setup"],
    },
  ],
});
