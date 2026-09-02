import { describe, expect, it } from "vitest";

import {
  RPM_MODULEMD_DEFAULTS_FIXTURE,
  RPM_MODULEMD_FIXTURE,
  RPM_MODULEMD_OBSOLETE_FIXTURE,
} from "../../../test/handlers";
import {
  listRpmModulemdDefaults,
  listRpmModulemdObsoletes,
  listRpmModulemds,
} from "./modulemd";

describe("rpm modulemd adapter", () => {
  it("lists modulemds", async () => {
    const page = await listRpmModulemds({ limit: 10, offset: 0 });
    expect(page.results).toEqual([RPM_MODULEMD_FIXTURE]);
  });

  it("lists modulemd defaults", async () => {
    const page = await listRpmModulemdDefaults({ limit: 10, offset: 0 });
    expect(page.results).toEqual([RPM_MODULEMD_DEFAULTS_FIXTURE]);
  });

  it("lists modulemd obsoletes", async () => {
    const page = await listRpmModulemdObsoletes({ limit: 10, offset: 0 });
    expect(page.results).toEqual([RPM_MODULEMD_OBSOLETE_FIXTURE]);
  });
});
