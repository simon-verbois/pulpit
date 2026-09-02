import type { PulpStatus } from "./client/status";

// Derived, never hardcoded to true (docs/ARCHITECTURE.md "Capability detection").
export interface PulpitCapabilities {
  rpm: boolean;
  container: boolean;
  ansible: boolean;
}

export function deriveCapabilities(status: PulpStatus | undefined): PulpitCapabilities {
  const components = new Set((status?.versions ?? []).map((v) => v.component));
  return {
    rpm: components.has("rpm"),
    container: components.has("container"),
    ansible: components.has("ansible"),
  };
}
