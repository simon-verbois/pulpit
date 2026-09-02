import { describe, expect, it } from "vitest";

import { RPM_REPO_METADATA_FILE_FIXTURE } from "../../../test/handlers";
import { listRpmRepoMetadataFiles } from "./repoMetadataFiles";

describe("rpm repo metadata files adapter", () => {
  it("lists repo metadata files", async () => {
    const page = await listRpmRepoMetadataFiles({ limit: 10, offset: 0 });
    expect(page.results).toEqual([RPM_REPO_METADATA_FILE_FIXTURE]);
  });
});
