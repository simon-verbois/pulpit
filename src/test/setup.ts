import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";

import { server } from "./mswServer";
import {
  resetAccessFixtures,
  resetAdministrationFixtures,
  resetAnsibleFixtures,
  resetContainerFixtures,
  resetDebFixtures,
  resetFileFixtures,
  resetGemFixtures,
  resetHuggingFaceFixtures,
  resetMavenFixtures,
  resetNpmFixtures,
  resetPythonFixtures,
  resetRpmFixtures,
  resetTasksFixtures,
} from "./handlers";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  resetRpmFixtures();
  resetFileFixtures();
  resetGemFixtures();
  resetHuggingFaceFixtures();
  resetMavenFixtures();
  resetNpmFixtures();
  resetPythonFixtures();
  resetDebFixtures();
  resetAnsibleFixtures();
  resetContainerFixtures();
  resetAccessFixtures();
  resetAdministrationFixtures();
  resetTasksFixtures();
});
afterAll(() => server.close());

// jsdom doesn't implement matchMedia - polyfill it so code that checks
// prefers-color-scheme (src/app/theme/ThemeContext.tsx) doesn't throw.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
