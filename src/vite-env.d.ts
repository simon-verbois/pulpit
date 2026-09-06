/// <reference types="vite/client" />

// Injected at build time from the repo-root VERSION file (see vite.config.ts).
declare const __APP_VERSION__: string;
// Injected at build time - when this build actually ran (see vite.config.ts).
declare const __BUILD_DATE__: string;
