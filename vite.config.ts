/// <reference types="vitest/config" />
import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Local dev convenience only (Mode A - see docs/DEVELOPMENT.md).
// The full-stack workflow (Mode B) never uses this proxy: nginx plays
// the same same-origin role in front of the built static assets there.
const PULP_DEV_TARGET = `http://localhost:${process.env.PULP_HTTP_PORT ?? "8180"}`;

// VERSION is a plain text file at the repo root, updated by the release
// process (not by this build) - baked in at build time so the running app
// can display it (AppFooter) without any runtime fetch. Defaults to
// "0.0.0-dev" for local/dev builds where no release has produced it yet.
const APP_VERSION = readFileSync(new URL("./VERSION", import.meta.url), "utf-8").trim();

// When this build actually ran, baked in the same way as APP_VERSION above -
// only ever shown by the dev banner (src/app/layout/DevBanner.tsx,
// VITE_DEV_BANNER), so a locally-built image's age is obvious at a glance
// without needing a git SHA. Rendered in the build environment's own
// timezone (process.env.TZ, set via the Dockerfile's build arg of the same
// name - deployment/docker/Dockerfile, compose-dev.yml) rather than a
// hardcoded UTC, with the zone's abbreviation made explicit so it's never
// ambiguous which timezone the timestamp is in.
function formatBuildDate(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const tzName =
    new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" })
      .formatToParts(date)
      .find((part) => part.type === "timeZoneName")?.value ?? timeZone;
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")} ${tzName}`;
}

const BUILD_TZ = process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone;
const BUILD_DATE = formatBuildDate(new Date(), BUILD_TZ);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
    __BUILD_DATE__: JSON.stringify(BUILD_DATE),
  },
  server: {
    proxy: {
      "/pulp": { target: PULP_DEV_TARGET, changeOrigin: true },
      "/v2": { target: PULP_DEV_TARGET, changeOrigin: true },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split large, slow-changing vendor code into its own chunks so it
        // can be cached across app-code deploys and downloaded in parallel,
        // instead of one oversized bundle (see docs/DEVELOPMENT.md).
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }
          if (id.includes("@patternfly")) {
            return "vendor-patternfly";
          }
          if (id.includes("@tanstack")) {
            return "vendor-query";
          }
          if (/node_modules\/(react|react-dom|react-router-dom)\//.test(id)) {
            return "vendor-react";
          }
          return undefined;
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: true,
    // e2e/ holds Playwright specs (run via `npm run test:e2e`), not Vitest tests.
    exclude: ["node_modules/**", "e2e/**"],
  },
});
