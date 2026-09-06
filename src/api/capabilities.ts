import type { PulpStatus } from "./client/status";

// Derived, never hardcoded to true (docs/ARCHITECTURE.md "Capability detection").
export interface PulpitCapabilities {
  rpm: boolean;
  container: boolean;
  ansible: boolean;
  file: boolean;
  deb: boolean;
  python: boolean;
  npm: boolean;
  gem: boolean;
  maven: boolean;
  hugging_face: boolean;
}

export function deriveCapabilities(status: PulpStatus | undefined): PulpitCapabilities {
  const components = new Set((status?.versions ?? []).map((v) => v.component));
  return {
    rpm: components.has("rpm"),
    container: components.has("container"),
    ansible: components.has("ansible"),
    file: components.has("file"),
    deb: components.has("deb"),
    python: components.has("python"),
    npm: components.has("npm"),
    gem: components.has("gem"),
    maven: components.has("maven"),
    hugging_face: components.has("hugging_face"),
  };
}
