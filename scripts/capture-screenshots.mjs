// Regenerates the screenshots used by README.md and the GitHub Pages site
// (docs/screenshots/). Needs the dev stack running (see docs/DEVELOPMENT.md)
// with the sample fixtures (pulpit-sample-rpm, pulpit-sample-container), and
// the admin password in PULP_ADMIN_PASSWORD or .env. Pages are chosen, and
// lists filtered, so no unrelated test data ends up in an image.
//
//   node scripts/capture-screenshots.mjs [baseUrl]
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const BASE_URL =
  process.argv[2] ?? process.env.PULPIT_BASE_URL ?? "http://localhost:8080";
const OUT_DIR = "docs/screenshots";
// Wide enough for the Overview status cards to sit on one row, like on a
// typical desktop browser window. Each shot sets its own height.
const WIDTH = 1760;
const THEME_KEY = "pulpit:theme";

function adminPassword() {
  if (process.env.PULP_ADMIN_PASSWORD) return process.env.PULP_ADMIN_PASSWORD;
  if (existsSync(".env")) {
    const match = readFileSync(".env", "utf-8").match(/^PULP_ADMIN_PASSWORD=(.+)$/m);
    if (match?.[1]) return match[1].trim();
  }
  throw new Error("PULP_ADMIN_PASSWORD is not set (env var or .env).");
}

// Each shot: output file, route, and an optional step run before capturing.
const SHOTS = [
  { file: "overview", height: 700, path: "/" },
  {
    file: "rpm-repositories",
    height: 700,
    path: "/rpm/repositories",
    prepare: (page) => search(page, "pulpit-sample"),
  },
  {
    file: "rpm-versions",
    height: 700,
    path: "/rpm/repositories/pulpit-sample-rpm?tab=versions",
  },
  {
    file: "rpm-distributions",
    height: 700,
    path: "/rpm/repositories/pulpit-sample-rpm?tab=distributions",
  },
  {
    file: "containers",
    height: 700,
    path: "/containers/repositories/pulpit-sample-container",
  },
  {
    file: "versions-dark",
    height: 700,
    path: "/rpm/repositories/pulpit-sample-rpm?tab=versions",
    theme: "dark",
  },
  {
    file: "admin-signing",
    height: 700,
    path: "/admin",
    prepare: (page) => openTab(page, "Repository Signing"),
  },
];

async function search(page, text) {
  const box = page.getByPlaceholder(/search/i).first();
  await box.fill(text);
  await box.press("Enter");
  await page.waitForLoadState("networkidle");
}

async function openTab(page, name) {
  await page.getByRole("tab", { name, exact: true }).click();
  await page.waitForLoadState("networkidle");
}

mkdirSync(OUT_DIR, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: WIDTH, height: 900 },
  deviceScaleFactor: 1,
  colorScheme: "light",
});
const page = await context.newPage();
await page.goto(`${BASE_URL}/login`);
await page.getByLabel("Username").fill("admin");
await page.getByLabel("Password").fill(adminPassword());
await page.getByRole("button", { name: "Log in" }).click();
await page.waitForURL(`${BASE_URL}/`);

for (const shot of SHOTS) {
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, value),
    [THEME_KEY, shot.theme ?? "light"],
  );
  await page.setViewportSize({ width: WIDTH, height: shot.height });
  await page.goto(`${BASE_URL}${shot.path}`);
  await page.waitForLoadState("networkidle");
  // The dev banner only exists in locally-built images.
  await page.addStyleTag({
    content:
      ".pulpit-dev-banner { display: none !important; } .pf-v6-c-masthead { border-block-start-color: transparent !important; }",
  });
  await shot.prepare?.(page);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT_DIR}/${shot.file}.png` });
  console.log(`captured ${shot.file}`);
}
await browser.close();
