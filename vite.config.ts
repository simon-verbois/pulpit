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

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
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
