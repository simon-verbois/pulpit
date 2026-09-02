import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { createRpmUlnRemote, deleteRpmUlnRemote, listRpmUlnRemotes } from "./ulnRemotes";

const BASE = "/pulp/api/v3/remotes/rpm/uln/";

describe("rpm uln remotes adapter", () => {
  it("lists ULN remotes (empty by default in this fixture set)", async () => {
    const page = await listRpmUlnRemotes({ limit: 10, offset: 0 });
    expect(page.results).toEqual([]);
  });

  it("creates a ULN remote synchronously (201, no task)", async () => {
    const remote = await createRpmUlnRemote({
      name: "uln-remote",
      url: "uln://el7_x86_64_oracle_ksplice",
      uln_server_base_url: "https://linux-update.oracle.com/",
      username: "test",
      password: "test",
    });
    expect(remote.name).toBe("uln-remote");
    expect(remote.uln_server_base_url).toBe("https://linux-update.oracle.com/");
  });

  it(
    "rejects creation without username/password " +
      "(VERIFIED live: required for ULN, unlike a standard remote)",
    async () => {
      server.use(
        http.post(BASE, () =>
          HttpResponse.json(
            {
              username: ["This field is required."],
              password: ["This field is required."],
            },
            { status: 400 },
          ),
        ),
      );

      await expect(
        createRpmUlnRemote({
          name: "uln-remote",
          url: "uln://x",
          uln_server_base_url: "https://linux-update.oracle.com/",
          username: "",
          password: "",
        }),
      ).rejects.toThrow();
    },
  );

  it("deletes a ULN remote and returns a task href", async () => {
    const result = await deleteRpmUlnRemote(`${BASE}remote-1/`);
    expect(result.task).toMatch(/^\/pulp\/api\/v3\/tasks\//);
  });
});
